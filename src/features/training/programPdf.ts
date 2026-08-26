import type { Organization } from '../../types';
import { generatePremiumTrainingProgramPdf } from './programPremiumPdf';
import type { TrainingProgramRecord, TrainingTrainerRecord } from './types';

export const TRAINING_PROGRAM_PDF_TITLE = 'Programme de formation';
export const TRAINING_PROGRAM_PRACTICAL_SECTION = 'Organisation pratique';

export async function generateTrainingProgramPdf(input: {
  organization: Organization;
  program: TrainingProgramRecord;
  trainers: TrainingTrainerRecord[];
}) {
  return generatePremiumTrainingProgramPdf(input);
}
