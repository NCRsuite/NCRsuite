import { rgb, type PDFPage } from 'pdf-lib';
import type { Organization } from '../../types';
import {
  createTrainingPdfTheme,
  drawTrainingParagraph,
  drawTrainingPdfText,
  drawTrainingPremiumFooter,
  drawTrainingPremiumHeader,
  drawTrainingSectionTitle,
  safeTrainingPdfName,
  TRAINING_PDF_MARGIN,
  TRAINING_PDF_PAGE,
  wrapTrainingPdfText,
  type TrainingPdfTheme
} from './premiumPdf';
import {
  formatTrainingMoney,
  modalityLabels,
  personName,
  type TrainingProgramRecord,
  type TrainingTrainerRecord
} from './types';

const CONTENT_WIDTH = TRAINING_PDF_PAGE[0] - TRAINING_PDF_MARGIN * 2;
const BOTTOM_LIMIT = 74;

export async function generateTrainingProgramPdf(input: {
  organization: Organization;
  program: TrainingProgramRecord;
  trainers: TrainingTrainerRecord[];
}) {
  const { organization, program, trainers } = input;
  const theme = await createTrainingPdfTheme(organization);
  const pages: Array<{ page: PDFPage; number: number; y: number }> = [];

  const addPage = (continuation = false) => {
    const page = theme.pdf.addPage(TRAINING_PDF_PAGE);
    const number = pages.length + 1;
    const y = drawTrainingPremiumHeader(page, theme, organization, {
      eyebrow: continuation ? 'FORMATION · PROGRAMME PÉDAGOGIQUE' : 'FORMATION · CATALOGUE OFFICIEL',
      title: continuation ? `${program.title} · suite` : 'Programme de formation',
      subtitle: program.title,
      reference: program.code || 'PROGRAMME',
      pageNumber: number
    });
    const state = { page, number, y };
    pages.push(state);
    return state;
  };

  let state = addPage();
  const ensure = (height: number) => {
    if (state.y - height < BOTTOM_LIMIT) state = addPage(true);
  };

  drawTrainingPdfText(state.page, program.title, { x: TRAINING_PDF_MARGIN, y: state.y, size: 19, font: theme.bold, color: theme.dark });
  state.y -= 30;
  if (program.description) {
    state.y = drawTrainingParagraph(state.page, theme, program.description, state.y, { size: 9.4, lineHeight: 14, maxLines: 7 });
    state.y -= 12;
  }

  const facts = [
    ['Durée', `${String(program.duration_hours).replace('.', ',')} heures`],
    ['Modalité', modalityLabels[program.modality]],
    ['Capacité', `${program.default_capacity} participant${program.default_capacity > 1 ? 's' : ''}`],
    ['Tarif indicatif', `${formatTrainingMoney(program.price_excl_tax_cents)} HT`]
  ];
  const factWidth = (CONTENT_WIDTH - 24) / 4;
  facts.forEach(([label, value], index) => {
    const x = TRAINING_PDF_MARGIN + index * (factWidth + 8);
    state.page.drawRectangle({ x, y: state.y - 62, width: factWidth, height: 62, color: index === 0 ? theme.accentSoft : theme.surface, borderColor: theme.line, borderWidth: 0.6 });
    drawTrainingPdfText(state.page, label.toUpperCase(), { x: x + 10, y: state.y - 18, size: 5.8, font: theme.bold, color: theme.accent });
    const lines = wrapTrainingPdfText(value, theme.bold, 8.2, factWidth - 20).slice(0, 2);
    lines.forEach((line, lineIndex) => drawTrainingPdfText(state.page, line, { x: x + 10, y: state.y - 38 - lineIndex * 11, size: 8.2, font: theme.bold, color: theme.dark }));
  });
  state.y -= 86;

  const sections: Array<{ title: string; value: string | null; index: string }> = [
    { title: 'Objectifs pédagogiques', value: program.objectives, index: '01' },
    { title: 'Public concerné', value: program.audience, index: '02' },
    { title: 'Prérequis', value: program.prerequisites, index: '03' },
    { title: 'Programme détaillé', value: program.detailed_program, index: '04' },
    { title: 'Méthodes pédagogiques', value: program.teaching_methods, index: '05' },
    { title: 'Moyens techniques et ressources', value: program.training_resources, index: '06' },
    { title: 'Modalités d’évaluation', value: program.assessment_methods, index: '07' },
    { title: 'Accessibilité', value: program.accessibility, index: '08' }
  ];

  for (const section of sections) {
    if (!section.value?.trim()) continue;
    const remaining = [...wrapTrainingPdfText(section.value, theme.regular, 8.7, CONTENT_WIDTH)];
    let continuation = false;
    while (remaining.length) {
      ensure(64);
      state.y = drawTrainingSectionTitle(
        state.page,
        theme,
        continuation ? `${section.title} · suite` : section.title,
        state.y,
        section.index
      );
      const room = Math.max(1, Math.floor((state.y - BOTTOM_LIMIT - 10) / 12.7));
      const chunk = remaining.splice(0, room);
      chunk.forEach((line) => {
        drawTrainingPdfText(state.page, line || ' ', { x: TRAINING_PDF_MARGIN, y: state.y, size: 8.7, font: theme.regular, color: theme.muted });
        state.y -= 12.7;
      });
      state.y -= 14;
      continuation = remaining.length > 0;
      if (continuation) state = addPage(true);
    }
  }

  ensure(108);
  state.y = drawTrainingSectionTitle(state.page, theme, 'Organisation pratique', state.y, '09');
  const practical = [
    ['Lieu habituel', program.default_location || 'À définir selon la session'],
    ['Formateurs habilités', trainers.length ? trainers.map((trainer) => personName(trainer.first_name, trainer.last_name)).join(', ') : 'À définir'],
    ['Code formation', program.code || '-'],
    ['Version du programme', new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(program.updated_at || program.created_at))]
  ];
  practical.forEach(([label, value], index) => {
    const y = state.y - index * 35;
    state.page.drawRectangle({ x: TRAINING_PDF_MARGIN, y: y - 27, width: CONTENT_WIDTH, height: 27, color: index % 2 === 0 ? theme.surface : rgb(1, 1, 1) });
    drawTrainingPdfText(state.page, label, { x: TRAINING_PDF_MARGIN + 10, y: y - 17, size: 7, font: theme.bold, color: theme.muted });
    const text = wrapTrainingPdfText(value, theme.regular, 7.8, CONTENT_WIDTH - 160).slice(0, 2);
    text.forEach((line, lineIndex) => drawTrainingPdfText(state.page, line, { x: TRAINING_PDF_MARGIN + 150, y: y - 17 - lineIndex * 10, size: 7.8, font: theme.regular, color: theme.dark }));
  });

  pages.forEach((item) => drawTrainingPremiumFooter(item.page, theme, organization, { reference: program.code || 'PROGRAMME', pageNumber: item.number, totalPages: pages.length }));
  theme.pdf.setTitle(`Programme de formation - ${program.title}`);
  theme.pdf.setAuthor(organization.public_name || organization.name);
  theme.pdf.setSubject(program.objectives || program.title);
  theme.pdf.setCreator('NCR Suite');
  theme.pdf.setProducer('NCR Suite V2.15.3');

  const bytes = await theme.pdf.save();
  const pdfBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return {
    blob: new Blob([pdfBuffer], { type: 'application/pdf' }),
    filename: `programme-${safeTrainingPdfName(program.code || program.title)}.pdf`
  };
}
