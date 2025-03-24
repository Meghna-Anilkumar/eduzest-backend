export const USER_ROUTES={
    SIGNUP:'/signup',
    OTP_VERIFY:'/otp-verification',
    USER_HOME:'/',
    LOGIN:'/login',
    GET_USER:'/getUserdata',
    LOGOUT:'/logout',
    RESEND_OTP:'/resend-otp',
    FORGOT_PASS:'/forgot-pass',
    RESET_PASS:'/reset-password',
    STUDENT_PROFILE:'/student-profile',
    INSTRUCTOR_PROFILE:'/instructor-profile',
    CHANGE_PASSWORD:'/change-password',
    GOOGLE_AUTH:'/google-auth',
    INSTRUCTOR_APPLY:'/instructor-apply',
    REFRESH_TOKEN:'/refresh-token',
    REFRESH_SIGNED_URL: "/refresh-signed-url", 
}


export const ADMIN_ROUTES={
    LOGIN:'/login',
    LOGOUT:'/logout',
    FETCHALL_STUDENTS:'/fetchAllStudents',
    FETCHALL_INSTRUCTORS:'/fetchAllinstructors',
    BLOCK_UNBLOCK_USER: '/block-unblock/:id',
    FETCH_REQUESTS:'/fetchAllRequestedUsers',
    APPROVE_INSTRUCTOR:'/approve-instructor/:id',
    REJECT_INSTRUCTOR:'/reject-instructor/:id',
    ADD_CATEGORY:'/create-category',
    FETCHALL_CATEGORIES: '/fetch-all-categories',
    EDIT_CATEGORY: '/edit-category/:categoryId',
    DELETE_CATEGORY: '/delete-category/:categoryId',
    GET_REQUESTDETAILS:'/getRequestDetails' 
}


export const INSTRUCTOR_ROUTES={
    CREATE_COURSE:'/create-course',
    GET_ALL_COURSES: '/courses'
}