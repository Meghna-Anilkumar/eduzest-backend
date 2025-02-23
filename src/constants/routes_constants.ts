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
    CHANGE_PASSWORD:'/change-password',
    GOOGLE_AUTH:'/google-auth',
    INSTRUCTOR_APPLY:'/instructor-apply'
}


export const ADMIN_ROUTES={
    LOGIN:'/login',
    LOGOUT:'/logout',
    FETCHALL_STUDENTS:'/fetchAllStudents',
    BLOCK_UNBLOCK_USER: '/block-unblock/:id',
    FETCH_REQUESTS:'/fetchAllRequestedUsers',
    APPROVE_INSTRUCTOR:'/approve-instructor/:id',
    REJECT_INSTRUCTOR:'/reject-instructor/:id' 
}