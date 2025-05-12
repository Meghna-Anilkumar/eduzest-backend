export interface DashboardStats {
    totalStudents: number;
    totalInstructors: number;
    activeCourses: number;
    totalRevenue: number;
    studentGrowth: { date: string; count: number }[];
    revenueOverview: { date: string; amount: number }[];
  }