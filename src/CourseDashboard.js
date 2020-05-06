import React from 'react';
import firebase from 'firebase/app';
import 'firebase/firestore';

import LoadingPage from './Loading';
import ErrorPage from './ErrorPage';
import Footer from './Footer';


class Dashboard extends React.Component {
    state = {
        courses: [],
        coursesData: [],
        gradeFilter: 'all',
        isLoadingComplete: false,
        isError: false,
    }

    componentDidMount = () => {
        this.getSystemConfig()
            .then( res => {
                const systemConfigDoc = res;
                const courseYear = systemConfigDoc.currentCourseYear;
                this.setState({ courseYear: courseYear });
                return this.checkCourseYearAvailable(courseYear, systemConfigDoc);
            })
            .then( res => {
                const { courseYear } = this.state;
                console.log(res);
                return this.getCourseYearConfig(courseYear);
            })
            .then( res => {
                const { courseYear } = this.state;
                this.setState({ gradesArr: res.grades });
                this.getCoursesData(courseYear);
            })
            .catch( err => {
                console.error(err);
                this.setState({
                    isLoadingComplete: true,
                    isError: true,
                    errorMessage: err
                })
            })
    }

    getSystemConfig = () => {
        const db = firebase.firestore();
        const configRef = db.collection('systemConfig').doc('config')
        return new Promise ((resolve, reject) => {
            configRef.get()
                .then(doc => {
                    if (!doc.exists) {
                        const err = 'No system config has been initilized.'
                        reject(err);
                    } else {
                        resolve(doc.data());
                    }
                })
                .catch(err => {
                    const errorMessage = 'Firebase failed getting system config.';
                    reject(errorMessage);
                    console.error(err);
                })
        })
    }

    getCourseYearConfig = (courseYear) => {
        const db = firebase.firestore();
        const courseYearConfigRef = db.collection(courseYear).doc('config');
        return new Promise ((resolve, reject) => {
            courseYearConfigRef.get()
                .then( doc => {
                    if (doc.exists) {
                        resolve(doc.data());
                    } else {
                        const err = `No config of course year ${courseYear} has been found in database.`
                        reject(err);
                    }
                })
                .catch( err => {
                    const errorMessage = 'Firebase failed getting course year config.';
                    reject(errorMessage);
                    console.error(err);
                })
        })
    }

    checkCourseYearAvailable = (courseYear, systemConfigDoc) => {
        return new Promise ((resolve, reject) => {
            const courseYearArr = systemConfigDoc.courseYears;
            let isCourseYearAvailable = false
            for (let i = 0; i < courseYearArr.length; i++) {
                if(courseYearArr[i].year === courseYear) {
                    isCourseYearAvailable = courseYearArr[i].available;
                }
            }
            if (isCourseYearAvailable) {
                resolve(`Courses in course year ${courseYear} is available to enroll.`);
            } else {
                reject(`Courses in course year ${courseYear} is not available to enroll.`);
            }
        })
    }

    getCoursesData = (courseYear) => {
        const db = firebase.firestore();
        const courseRef = db.collection(courseYear).doc('course').collection('course');
        const { gradeFilter } = this.state;
        let coursesArr = [];
        courseRef.onSnapshot(querySnapshot => {
            coursesArr = [];
            querySnapshot.forEach(doc => {
                coursesArr.push(doc.data())
            })
            this.setState({ coursesData: coursesArr });
            this.filterCoursesDataByGrade(coursesArr,gradeFilter)
                .then( res => {
                    const coursesDataFiltered = res;
                    this.setState({
                        courses: coursesDataFiltered,
                        isLoadingComplete: true
                    });
                })
        });
    }

    filterCoursesDataByGrade = (coursesData, grade) => {
        return new Promise ( resolve => {
            let coursesDataFiltered = [];
            if (grade === 'all') {
                coursesDataFiltered = coursesData
            } else {
                for (let i = 0; i < coursesData.length; i++) {
                    const course = coursesData[i];
                    for (let j = 0; j < course.courseGrade.length; j++) {
                        const courseGrade = course.courseGrade[j];
                        if ( courseGrade === grade || courseGrade === parseInt(grade) ) {
                            coursesDataFiltered.push(course);
                        }
                    }
                }
            }
            resolve(coursesDataFiltered);
        })
        
    }

    handleChangeFilter = (event) => {
        const { coursesData } = this.state;
        const gradeFilter = event.target.value;
        this.filterCoursesDataByGrade(coursesData, gradeFilter)
            .then(res => {
                const coursesDataFiltered = res;
                this.setState({
                    courses: coursesDataFiltered,
                    gradeFilter: gradeFilter
                });
            })
    } 

    // appendLinkFontAwesome = () => {
    //     const link = document.createElement('link');
    //     link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.css';
    //     link.rel = 'stylesheet';
    //     document.head.appendChild(link);
    // }

    courseDashboard = (coursesData) => {
        const { courseYear } = this.state;
        if (coursesData.length === 0){
            return (
                <div className="mt-4 text-center">
                    <p>Sorry, it is empty.</p>
                </div>
            )
        } else {
            let courseDashboard = coursesData.map((course, i) => {
                let courseStatus = null;
                let btnEnroll = null;
                if (course.courseEnrolled < course.courseCapacity) {
                    courseStatus = course.courseCapacity - course.courseEnrolled
                    let courseEnrollLink = `/course/enroll?courseYear=${courseYear}&courseID=${course.courseID}`
                    btnEnroll = () => {
                        return (<a className="btn btn-enroll btn-purple" href={courseEnrollLink}>Enroll</a>);
                    }
                } else {
                    courseStatus = 'Full'
                    btnEnroll = () => {
                        return (<button className="btn btn-enroll btn-purple" disabled>Full</button>);
                    }
                }
                return (
                    <div className="course row" key={i}>
                        <div className="col-md-10">
                            <div className="row align-items-center">
                                <div className="detail col-sm-6">
                                    <span className="course-name">{course.courseID} {course.courseName}</span>
                                    <span><i className="fa fa-fw fa-user" aria-hidden="true"></i> {course.courseTeacher}</span>
                                    <span><i className="fa fa-fw fa-check-square-o" aria-hidden="true"></i> Grade {course.courseGrade.join(', ')} students</span> 
                                </div>
                                <div className="col-sm-6">
                                    <div className="row align-items-center">
                                        <div className="col stat">
                                            <span className="stat-description">Capacity</span>
                                            <span className="stat-number">{course.courseCapacity}</span>
                                        </div>
                                        <div className="col stat">
                                            <span className="stat-description">Enrolled</span>
                                            <span className="stat-number">{course.courseEnrolled}</span>
                                        </div>
                                        <div className="col stat">
                                            <span className="stat-description">Available</span>
                                            <span className="stat-number">{courseStatus}</span>
                                        </div>
                                    </div>
                                </div>
                                
                            </div>
                            
                        </div>
                        <div className="course-btn col-md-2">
                            {btnEnroll()}
                        </div>
                    </div>
                )
            })
            return (courseDashboard)
        }
    }

    render(){
        const { isLoadingComplete, isError, errorMessage } = this.state;
        if(!isLoadingComplete){
            return (
                <LoadingPage/>
            )
        } else if (isError){
            return (
                <ErrorPage errorMessage={errorMessage} btn={'home'}/>
            )
        } else {
            const { courses, courseYear, gradesArr } = this.state;
            const courseDashboard = this.courseDashboard;
            return (
                <div id="course-dashboard" className="body bg-gradient">
                    <div className="wrapper">
                        <h1>Elective Course Enrollment System</h1>
                        <h2>Course Year {courseYear}</h2>
                        <label htmlFor="grade-filter">Filter courses by grade:</label>
                        <select id="grade-filter" className="form-control" defaultValue="all" onChange={this.handleChangeFilter}>
                            <option value="all">All</option>
                            {gradesArr.map((grade, i) => {return( <option value={grade} key={i}>Grade {grade}</option> )})}
                        </select>
                        {courseDashboard(courses)}
                        <a href="/" className="btn btn-wrapper-bottom btn-green">Home</a>
                    </div>
                    <Footer/>
                </div>
            )
        }

        
    }
}

export default Dashboard;