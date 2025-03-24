import { Types } from "mongoose";
import { CustomError } from "../utils/CustomError"; // Adjust the path as needed
import { ICourse, IModule, ILesson } from "../interfaces/ICourse";
import { ICategoryRepository } from "../interfaces/IRepositories"; // Adjust the path as needed

export const validateCourseData = async (
  courseData: Partial<ICourse>,
  categoryRepository: ICategoryRepository
): Promise<void> => {
  // Validate required fields
  const requiredFields: (keyof ICourse)[] = [
    "title",
    "description",
    "thumbnail",
    "instructorRef",
    "categoryRef",
    "language",
    "level",
  ];
  for (const field of requiredFields) {
    if (!courseData[field]) {
      throw new CustomError(`${field} is required.`, 400, field);
    }
  }

  const trimmedTitle = courseData.title!.trim();
  if (!trimmedTitle) {
    throw new CustomError("Course title cannot be empty.", 400, "title");
  }

  // Validate categoryRef
  const categoryRefString = courseData.categoryRef as unknown as string;
  if (!Types.ObjectId.isValid(categoryRefString)) {
    throw new CustomError("Invalid category ID.", 400, "categoryRef");
  }

  const categoryRef = new Types.ObjectId(categoryRefString);
  const category = await categoryRepository.findById(categoryRefString);
  if (!category) {
    throw new CustomError("Category not found.", 404, "categoryRef");
  }

  // Validate pricing
  if (!courseData.pricing || !["free", "paid"].includes(courseData.pricing.type)) {
    throw new CustomError("Pricing type must be 'free' or 'paid'.", 400, "pricing.type");
  }
  if (courseData.pricing.type === "paid" && (!courseData.pricing.amount || courseData.pricing.amount <= 0)) {
    throw new CustomError("Amount must be greater than 0 for paid courses.", 400, "pricing.amount");
  }

  // Validate modules and lessons
  if (!courseData.modules || !Array.isArray(courseData.modules) || courseData.modules.length === 0) {
    throw new CustomError("At least one module is required.", 400, "modules");
  }

  for (let i = 0; i < courseData.modules.length; i++) {
    const module: IModule = courseData.modules[i];
    if (!module.moduleTitle?.trim()) {
      throw new CustomError(`Module ${i + 1} title is required.`, 400, `modules[${i}].moduleTitle`);
    }

    if (!module.lessons || !Array.isArray(module.lessons) || module.lessons.length === 0) {
      throw new CustomError(`Module ${i + 1} must have at least one lesson.`, 400, `modules[${i}].lessons`);
    }

    for (let j = 0; j < module.lessons.length; j++) {
      const lesson: ILesson = module.lessons[j];
      const lessonFields: (keyof ILesson)[] = ["lessonNumber", "title", "description", "video", "objectives"];
      for (const field of lessonFields) {
        if (!lesson[field]) {
          throw new CustomError(`Lesson ${j + 1} ${field} is required in Module ${i + 1}.`, 400, `modules[${i}].lessons[${j}].${field}`);
        }
      }
      if (!Array.isArray(lesson.objectives) || lesson.objectives.length === 0) {
        throw new CustomError(`Lesson ${j + 1} must have at least one objective in Module ${i + 1}.`, 400, `modules[${i}].lessons[${j}].objectives`);
      }
    }
  }
};