import Types from 'mongoose'
export interface ILessonData {
    _id?: string;
    lessonNumber: string;
    title: string;
    description: string;
    video: string;
    videoKey?: string;
    duration?: string;
    objectives?: string[];
  }
  
  // Interface for a plain module data object (not a Mongoose Document)
  export interface IModuleData {
    _id?: string;
    moduleTitle: string;
    lessons: ILessonData[];
  }
  
  // Update ICourseUpdate to be more explicit
  export interface IUpdate {
    _id?: string;
    title?: string;
    description?: string;
    thumbnail?: string;
    instructorRef?: Types.ObjectId;
    categoryRef?: Types.ObjectId;
    language?: string;
    level?: "beginner" | "intermediate" | "advanced";
    modules?: IModuleData[];
    // trial?: Partial<ITrial>;
    // pricing?: IPricing;
    // attachments?: IAttachment;
    isRequested?: boolean;
    isBlocked?: boolean;
    studentsEnrolled?: number;
    isPublished?: boolean;
    isRejected?: boolean;
  }