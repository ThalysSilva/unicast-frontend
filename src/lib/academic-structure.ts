import { apiRequest, extractData } from "@/lib/api";
import type { ApiResponse, Campus, Discipline, Program } from "@/lib/types";

export type AcademicProgram = Program & {
  campusId: string;
  campusName: string;
};

export type AcademicDiscipline = Discipline & {
  campusId: string;
  campusName: string;
  programId: string;
  programName: string;
};

export type AcademicStructure = {
  campuses: Campus[];
  programs: AcademicProgram[];
  disciplines: AcademicDiscipline[];
};

const isProgramLike = (value: unknown): value is Program => {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<Program>;
  return Boolean(candidate.id && candidate.name);
};

const isDisciplineLike = (value: unknown): value is Discipline => {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<Discipline>;
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

  const disciplineResults = await Promise.allSettled(
    uniquePrograms.map((program) =>
      apiRequest<ApiResponse<Discipline[]>>(`/discipline/${program.id}`)
    )
  );

  const disciplines = disciplineResults.flatMap((result, index) => {
    const program = uniquePrograms[index];
    if (result.status !== "fulfilled") return [];

    const data = extractData(result.value);
    if (!Array.isArray(data)) return [];

    return data
      .filter((discipline): discipline is Discipline => isDisciplineLike(discipline))
      .map((discipline) => ({
        ...discipline,
        campusId: program.campusId,
        campusName: program.campusName,
        programId: program.id,
        programName: program.name,
      }));
  });

  return {
    campuses,
    programs: uniquePrograms,
    disciplines,
  };
};
