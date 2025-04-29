export const USER_ROUTES = {
    SIGNUP: '/signup',
    OTP_VERIFY: '/otp-verification',
    USER_HOME: '/',
    LOGIN: '/login',
    GET_USER: '/getUserdata',
    LOGOUT: '/logout',
    RESEND_OTP: '/resend-otp',
    FORGOT_PASS: '/forgot-pass',
    RESET_PASS: '/reset-password',
    STUDENT_PROFILE: '/student-profile',
    INSTRUCTOR_PROFILE: '/instructor-profile',
    CHANGE_PASSWORD: '/change-password',
    GOOGLE_AUTH: '/google-auth',
    INSTRUCTOR_APPLY: '/instructor-apply',
    REFRESH_TOKEN: '/refresh-token',
    REFRESH_SIGNED_URL: '/refresh-signed-url',
    GET_ALL_ACTIVE_COURSES: '/active-courses',
    GET_COURSE_BY_ID: '/courses/:id',
    STREAM_VIDEO: "/courses/:courseId/stream",
    GET_REVIEWS: "/courses/:courseId/reviews",
    SWITCH_TO_INSTRUCTOR:'/switch-to-instructor'
}


export const ADMIN_ROUTES = {
    LOGIN: '/login',
    LOGOUT: '/logout',
    FETCHALL_STUDENTS: '/fetchAllStudents',
    FETCHALL_INSTRUCTORS: '/fetchAllinstructors',
    BLOCK_UNBLOCK_USER: '/block-unblock/:id',
    FETCH_REQUESTS: '/fetchAllRequestedUsers',
    APPROVE_INSTRUCTOR: '/approve-instructor/:id',
    REJECT_INSTRUCTOR: '/reject-instructor/:id',
    ADD_CATEGORY: '/create-category',
    FETCHALL_CATEGORIES: '/fetch-all-categories',
    EDIT_CATEGORY: '/edit-category/:categoryId',
    DELETE_CATEGORY: '/delete-category/:categoryId',
    GET_REQUESTDETAILS: '/getRequestDetails',
    GET_TRANSACTIONS: '/getTransactions',
    GET_DASHBOARD_STATS:'/dashboard-stats'
}


export const INSTRUCTOR_ROUTES = {
    CREATE_COURSE: '/create-course',
    GET_ALL_COURSES_BYINSTRUCTOR: '/courses',
    EDIT_COURSE: '/courses/:id',
    GET_COURSE_BYINSTRUCTOR: '/courses/:id',
    GET_TRANSACTIONS: '/getTransactions',
    CREATE_ASSESSMENT: '/courses/:courseId/modules/:moduleTitle/assessments',
    GET_ASSESSMENTS: '/courses/:courseId/modules/:moduleTitle/assessments',
    EDIT_ASSESSMENT: '/assessments/:assessmentId',
    DELETE_ASSESSMENT: '/assessments/:assessmentId',
    GET_COURSE_STATS:'/course-stats'
}


export const STUDENT_ROUTES = {
    CREATE_PAYMENT_INTENT: '/create-payment-intent',
    CONFIRM_PAYMENT: '/confirm-payment',
    ENROLL_COURSE: '/enroll-course',
    CHECK_ENROLLMENT: '/check-enrollment/:courseId',
    GET_ENROLLMENTS: '/enrollments',
    GET_PAYMENT_HISTORY: '/payment-history',
    ADD_REVIEW: '/reviews',
    GET_REVIEW: "/review/:courseId",
    UPDATE_LESSON_PROGRESS: "/update-lesson-progress",
    GET_LESSON_PROGRESS: "/lesson-progress/:courseId",
    GET_ASSESSMENTS_FOR_STUDENT: '/courses/:courseId/modules/:moduleTitle/assessments',
    // GET_ASSESSMENT_BY_ID: '/assessments/:assessmentId',
    SUBMIT_ASSESSMENT: '/assessments/:assessmentId/submit',
    GET_ASSESSMENT_RESULT: '/assessments/:assessmentId/result',
    GET_ASSESSMENT_BY_ID_FOR_STUDENT:'/assessments/:assessmentId',
    GET_COURSE_PROGRESS:'/courses/:courseId/progress',
    GET_ASSESSMENTS_BY_COURSE:'/courses/:courseId/assessments'
};