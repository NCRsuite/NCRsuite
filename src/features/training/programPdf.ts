import type { PDFPage } from 'pdf-lib';
import type { Organization } from '../../types';
import {
  createTrainingPdfTheme,
  drawTrainingPdfText,
  safeTrainingPdfName,
  wrapTrainingPdfText,
  type TrainingPdfTheme
} from './premiumPdf';
import {
  CARD_DOCUMENT_BOTTOM_LIMIT,
  CARD_DOCUMENT_CONTENT_WIDTH,
  drawCardDocumentFooter,
  drawCardDocumentHeader,
  drawCardFrame,
  drawCardHeading,
  drawCardMetric,
  drawCardSectionTitle,
  drawCardTextBlock
} from './cardDocumentPdf';
import {
  formatTrainingMoney,
  modalityLabels,
  personName,
  type TrainingProgramRecord,
  type TrainingTrainerRecord
} from './types';

const CONTENT_WIDTH = CARD_DOCUMENT_CONTENT_WIDTH;
const MARGIN = 42;

type PageState = { page: PDFPage; number: number; y: number };

function drawKeyCard(
  page: PDFPage,
  theme: TrainingPdfTheme,
  input: { x: number; y: number; width: number; height: number; title: string; lines: string[] }
) {
  drawCardFrame(page, theme, { x: input.x, y: input.y, width: input.width, height: input.height, fill: 'white' });
  drawCardHeading(page, theme, input.title, input.x + 12, input.y - 18);
  input.lines.forEach((line, index) => drawTrainingPdfText(page, line || ' ', {
    x: input.x + 12,
    y: input.y - 39 - index * 10,
    size: 7.1,
    font: theme.regular,
    color: theme.muted
  }));
}

export async function generateTrainingProgramPdf(input: {
  organization: Organization;
  program: TrainingProgramRecord;
  trainers: TrainingTrainerRecord[];
}) {
  const { organization, program, trainers } = input;
  const theme = await createTrainingPdfTheme(organization);
  const pages: PageState[] = [];
  const versionDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(program.updated_at || program.created_at));

  const addPage = (continuation = false) => {
    const page = theme.pdf.addPage([595.28, 841.89]);
    const number = pages.length + 1;
    const y = drawCardDocumentHeader(page, theme, organization, {
      badge: 'PROGRAMME',
      title: 'Programme de formation',
      subtitle: continuation ? `${program.title} · suite` : program.title,
      reference: program.code || 'PROGRAMME',
      meta: continuation ? `Page ${number}` : `Version ${versionDate}`,
      continuation
    });
    const state = { page, number, y };
    pages.push(state);
    return state;
  };

  let state = addPage();
  const ensure = (height: number) => {
    if (state.y - height < CARD_DOCUMENT_BOTTOM_LIMIT) state = addPage(true);
  };

  const factGap = 8;
  const factWidth = (CONTENT_WIDTH - factGap * 3) / 4;
  [
    ['Durée', `${String(program.duration_hours).replace('.', ',')} heures`],
    ['Format', modalityLabels[program.modality]],
    ['Capacité', `${program.default_capacity} participant${program.default_capacity > 1 ? 's' : ''}`],
    ['Tarif indicatif', `${formatTrainingMoney(program.price_excl_tax_cents)} HT`]
  ].forEach(([label, value], index) => drawCardMetric(state.page, theme, {
    x: MARGIN + index * (factWidth + factGap),
    y: state.y,
    width: factWidth,
    height: 68,
    label,
    value,
    emphasized: index === 0
  }));
  state.y -= 84;

  if (program.description?.trim()) {
    ensure(210);
    state.y = drawCardSectionTitle(state.page, theme, 'Vue d’ensemble', state.y, 'FORMATION');
    const descriptionLines = wrapTrainingPdfText(program.description, theme.regular, 7.7, CONTENT_WIDTH - 24);
    const firstChunk = descriptionLines.splice(0, 9);
    state.y = drawCardTextBlock(state.page, theme, {
      x: MARGIN,
      y: state.y,
      width: CONTENT_WIDTH,
      title: program.title,
      lines: firstChunk,
      fill: 'surface',
      accentEdge: true
    }) - 14;
    if (descriptionLines.length) {
      state = addPage(true);
      while (descriptionLines.length) {
        const available = Math.max(60, state.y - CARD_DOCUMENT_BOTTOM_LIMIT - 38);
        const maxLines = Math.max(3, Math.min(26, Math.floor((available - 52) / 10.5)));
        const chunk = descriptionLines.splice(0, maxLines);
        state.y = drawCardTextBlock(state.page, theme, {
          x: MARGIN,
          y: state.y,
          width: CONTENT_WIDTH,
          title: 'Présentation · suite',
          lines: chunk,
          fill: 'white'
        }) - 12;
        if (descriptionLines.length) state = addPage(true);
      }
    }
  }

  const keySections = [
    { title: 'Objectifs pédagogiques', value: program.objectives || 'À préciser' },
    { title: 'Public visé', value: program.audience || 'À préciser' },
    { title: 'Prérequis', value: program.prerequisites || 'Aucun prérequis spécifique' }
  ];
  const keyGap = 9;
  const keyWidth = (CONTENT_WIDTH - keyGap * 2) / 3;
  const keyData = keySections.map((section) => {
    const allLines = wrapTrainingPdfText(section.value, theme.regular, 7.1, keyWidth - 24);
    return { ...section, allLines, visible: allLines.slice(0, 7), overflow: allLines.slice(7) };
  });
  const keyHeight = Math.max(104, 50 + Math.max(...keyData.map((section) => section.visible.length)) * 10);
  ensure(keyHeight + 62);
  state.y = drawCardSectionTitle(state.page, theme, 'À qui s’adresse la formation ?', state.y, 'OBJECTIFS & PUBLIC');
  keyData.forEach((section, index) => drawKeyCard(state.page, theme, {
    x: MARGIN + index * (keyWidth + keyGap),
    y: state.y,
    width: keyWidth,
    height: keyHeight,
    title: section.title,
    lines: section.visible
  }));
  state.y -= keyHeight + 16;

  for (const section of keyData.filter((item) => item.overflow.length)) {
    let remaining = [...section.overflow];
    while (remaining.length) {
      ensure(78);
      const available = Math.max(60, state.y - CARD_DOCUMENT_BOTTOM_LIMIT - 38);
      const maxLines = Math.max(3, Math.min(25, Math.floor((available - 52) / 10.5)));
      const chunk = remaining.splice(0, maxLines);
      state.y = drawCardTextBlock(state.page, theme, {
        x: MARGIN,
        y: state.y,
        width: CONTENT_WIDTH,
        title: `${section.title} · suite`,
        lines: chunk,
        fill: 'white'
      }) - 12;
      if (remaining.length) state = addPage(true);
    }
  }

  const renderLongSection = (title: string, value: string | null, options?: { fill?: 'white' | 'surface' | 'accent'; eyebrow?: string }) => {
    if (!value?.trim()) return;
    let remaining = [...wrapTrainingPdfText(value, theme.regular, 7.5, CONTENT_WIDTH - 24)];
    let continuation = false;
    while (remaining.length) {
      ensure(84);
      if (!continuation) state.y = drawCardSectionTitle(state.page, theme, title, state.y, options?.eyebrow);
      const available = Math.max(60, state.y - CARD_DOCUMENT_BOTTOM_LIMIT - 38);
      const maxLines = Math.max(3, Math.min(28, Math.floor((available - 52) / 10.5)));
      const chunk = remaining.splice(0, maxLines);
      state.y = drawCardTextBlock(state.page, theme, {
        x: MARGIN,
        y: state.y,
        width: CONTENT_WIDTH,
        title: continuation ? `${title} · suite` : title,
        lines: chunk,
        fill: options?.fill || 'white',
        accentEdge: options?.fill === 'surface'
      }) - 12;
      continuation = remaining.length > 0;
      if (continuation) state = addPage(true);
    }
  };

  renderLongSection('Programme détaillé', program.detailed_program, { fill: 'surface', eyebrow: 'CONTENU PÉDAGOGIQUE' });
  renderLongSection('Méthodes pédagogiques', program.teaching_methods, { eyebrow: 'MÉTHODES' });
  renderLongSection('Moyens techniques et ressources', program.training_resources, { eyebrow: 'RESSOURCES' });
  renderLongSection('Modalités d’évaluation', program.assessment_methods, { eyebrow: 'ÉVALUATION' });
  renderLongSection('Accessibilité', program.accessibility, { fill: 'accent', eyebrow: 'ACCESSIBILITÉ' });

  ensure(214);
  state.y = drawCardSectionTitle(state.page, theme, 'Organisation pratique', state.y, 'REPÈRES');
  const practicalGap = 10;
  const practicalWidth = (CONTENT_WIDTH - practicalGap) / 2;
  const trainerNames = trainers.length
    ? trainers.map((trainer) => personName(trainer.first_name, trainer.last_name)).join(', ')
    : 'À définir selon la session';
  const practical = [
    ['Lieu habituel', program.default_location || 'À définir selon la session'],
    ['Formateur(s)', trainerNames],
    ['Code formation', program.code || '-'],
    ['Version du programme', versionDate]
  ];
  practical.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    drawCardMetric(state.page, theme, {
      x: MARGIN + column * (practicalWidth + practicalGap),
      y: state.y - row * 76,
      width: practicalWidth,
      height: 66,
      label,
      value
    });
  });
  state.y -= 164;

  if (organization.training_document_footer?.trim()) {
    const lines = wrapTrainingPdfText(organization.training_document_footer, theme.regular, 6.6, CONTENT_WIDTH - 24);
    ensure(42 + lines.length * 9);
    state.y = drawCardTextBlock(state.page, theme, {
      x: MARGIN,
      y: state.y,
      width: CONTENT_WIDTH,
      title: 'Informations utiles',
      lines,
      lineHeight: 9,
      fill: 'accent'
    }) - 6;
  }

  pages.forEach((item) => drawCardDocumentFooter(item.page, theme, organization, {
    reference: program.code || 'PROGRAMME',
    pageNumber: item.number,
    totalPages: pages.length
  }));

  theme.pdf.setTitle(`Programme de formation - ${program.title}`);
  theme.pdf.setAuthor(organization.public_name || organization.name);
  theme.pdf.setSubject(program.objectives || program.title);
  theme.pdf.setCreator('NCR Suite');
  theme.pdf.setProducer('NCR Suite · Card-based document system');

  const bytes = await theme.pdf.save();
  const pdfBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return {
    blob: new Blob([pdfBuffer], { type: 'application/pdf' }),
    filename: `programme-${safeTrainingPdfName(program.code || program.title)}.pdf`
  };
}
