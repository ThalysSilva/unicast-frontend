import { apiRequest, extractData } from "@/lib/api";
import type { ApiResponse, Campus, Course, Program } from "@/lib/types";

export type AcademicProgram = Program & {
  campusId: string;
  campusName: string;
};

export type AcademicCourse = Course & {
  campusId: string;
  campusName: string;
  programId: string;
  programName: string;
};

export type AcademicStructure = {
  campuses: Campus[];
  programs: AcademicProgram[];
  courses: AcademicCourse[];
};

const isProgramLike = (value: unknown): value is Program => {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<Program>;
  return Boolean(candidate.id && candidate.name);
};

const isCourseLike = (value: unknown): value is Course => {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<Course>;
  return Boolean(candidate.id && candidate.name);
};

export const loadAcademicStructure = async (): Promise<AcademicStructure> => {
  const campusRes = await apiRequest<ApiResponse<Campus[]>>("/campus");
  const campuses = extractData(campusRes);

  const programResults = await Promise.allSettled(
    campuses.map((campus) =>
      apiRequest<ApiResponse<Program[]>>(`/program/${campus.id}`)
    )
  );

  const programs = programResults.flatMap((result, index) => {
    const campus = campuses[index];
    if (result.status !== "fulfilled") return [];

    const data = extractData(result.value);
    if (!Array.isArray(data)) return [];

    return data
      .filter(
        (program): program is Program =>
          isProgramLike(program) &&
          (program.id !== campus.id || program.name !== campus.name)
      )
      .map((program) => ({
        ...program,
        campusId: campus.id,
        campusName: campus.name,
      }));
  });

  const uniquePrograms = Array.from(
    new Map(programs.map((program) => [program.id, program])).values()
  );

  const courseResults = await Promise.allSettled(
    uniquePrograms.map((program) =>
      apiRequest<ApiResponse<Course[]>>(`/course/${program.id}`)
    )
  );

  const courses = courseResults.flatMap((result, index) => {
    const program = uniquePrograms[index];
    if (result.status !== "fulfilled") return [];

    const data = extractData(result.value);
    if (!Array.isArray(data)) return [];

    return data
      .filter((course): course is Course => isCourseLike(course))
      .map((course) => ({
        ...course,
        campusId: program.campusId,
        campusName: program.campusName,
        programId: program.id,
        programName: program.name,
      }));
  });

  return {
    campuses,
    programs: uniquePrograms,
    courses,
  };
};

