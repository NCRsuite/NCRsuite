import { rgb, type PDFPage } from 'pdf-lib';
import type { Organization } from '../../types';
import {
  createTrainingPdfTheme,
  drawTrainingPdfText,
  normalizeTrainingPdfText,
  safeTrainingPdfName,
  trainingPdfText,
  wrapTrainingPdfText,
  type TrainingPdfTheme
} from './premiumPdf';
import { drawCardDocumentFooter } from './cardDocumentPdf';
import {
  formatTrainingMoney,
  modalityLabels,
  personName,
  type TrainingProgramRecord,
  type TrainingTrainerRecord
} from './types';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM_LIMIT = 68;

type ProgramPdfInput = {
  organization: Organization;
  program: TrainingProgramRecord;
  trainers: TrainingTrainerRecord[];
};

type PageState = { page: PDFPage; y: number; number: number };

type EditorialSection = { title: string; value: unknown; eyebrow?: string; accent?: boolean };

function drawProgramHeader(
  page: PDFPage,
  theme: TrainingPdfTheme,
  organization: Organization,
  program: TrainingProgramRecord,
  versionDate: string,
  continuation = false,
  pageNumber = 1
) {
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 6, width: PAGE_WIDTH, height: 6, color: theme.accent });

  if (continuation) {
    drawTrainingPdfText(page, organization.public_name || organization.name, {
      x: MARGIN,
      y: PAGE_HEIGHT - 46,
      size: 9.4,
      font: theme.bold,
      color: theme.dark
    });
    drawTrainingPdfText(page, `Programme de formation · ${program.code || program.title}`, {
      x: MARGIN,
      y: PAGE_HEIGHT - 61,
      size: 6.7,
      font: theme.regular,
      color: theme.muted
    });
    const label = `SUITE · PAGE ${pageNumber}`;
    const text = trainingPdfText(label, theme.bold);
    const width = theme.bold.widthOfTextAtSize(text, 6.4) + 22;
    page.drawRectangle({ x: PAGE_WIDTH - MARGIN - width, y: PAGE_HEIGHT - 58, width, height: 22, color: theme.accentPale });
    drawTrainingPdfText(page, text, {
      x: PAGE_WIDTH - MARGIN - width + 11,
      y: PAGE_HEIGHT - 50,
      size: 6.4,
      font: theme.bold,
      color: theme.accent
    });
    page.drawLine({
      start: { x: MARGIN, y: PAGE_HEIGHT - 78 },
      end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 78 },
      thickness: 0.6,
      color: theme.line
    });
    return PAGE_HEIGHT - 104;
  }

  if (theme.logo) {
    const scale = Math.min(84 / theme.logo.width, 36 / theme.logo.height, 1);
    page.drawImage(theme.logo, {
      x: MARGIN,
      y: PAGE_HEIGHT - 75,
      width: theme.logo.width * scale,
      height: theme.logo.height * scale
    });
  } else {
    page.drawRectangle({ x: MARGIN, y: PAGE_HEIGHT - 73, width: 38, height: 38, color: theme.accent });
    drawTrainingPdfText(page, String(organization.public_name || organization.name).slice(0, 2).toUpperCase(), {
      x: MARGIN + 8,
      y: PAGE_HEIGHT - 59,
      size: 12,
      font: theme.bold,
      color: rgb(1, 1, 1)
    });
  }

  const brandX = theme.logo ? MARGIN + 96 : MARGIN + 50;
  drawTrainingPdfText(page, organization.public_name || organization.name, {
    x: brandX,
    y: PAGE_HEIGHT - 47,
    size: 11.5,
    font: theme.bold,
    color: theme.dark
  });
  const contact = [organization.company_email, organization.company_phone].filter(Boolean).join(' · ');
  if (contact) {
    drawTrainingPdfText(page, contact.slice(0, 78), {
      x: brandX,
      y: PAGE_HEIGHT - 62,
      size: 6.2,
      font: theme.regular,
      color: theme.muted
    });
  }

  const badgeWidth = 96;
  page.drawRectangle({ x: PAGE_WIDTH - MARGIN - badgeWidth, y: PAGE_HEIGHT - 60, width: badgeWidth, height: 28, color: theme.accent });
  drawTrainingPdfText(page, 'PROGRAMME', {
    x: PAGE_WIDTH - MARGIN - badgeWidth + 22,
    y: PAGE_HEIGHT - 50,
    size: 7,
    font: theme.bold,
    color: rgb(1, 1, 1)
  });

  const refLines = [program.code || 'PROGRAMME', `Version ${versionDate}`];
  refLines.forEach((line, index) => {
    const font = index === 0 ? theme.bold : theme.regular;
    const size = index === 0 ? 6.7 : 5.8;
    const text = trainingPdfText(line, font);
    const width = font.widthOfTextAtSize(text, size);
    drawTrainingPdfText(page, text, {
      x: Math.max(PAGE_WIDTH - MARGIN - 190, PAGE_WIDTH - MARGIN - width),
      y: PAGE_HEIGHT - 73 - index * 10,
      size,
      font,
      color: index === 0 ? theme.dark : theme.muted
    });
  });

  page.drawLine({
    start: { x: MARGIN, y: PAGE_HEIGHT - 103 },
    end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 103 },
    thickness: 0.7,
    color: theme.line
  });

  drawTrainingPdfText(page, 'Programme de formation', {
    x: MARGIN,
    y: PAGE_HEIGHT - 142,
    size: 25,
    font: theme.bold,
    color: theme.dark
  });
  drawTrainingPdfText(page, 'Objectifs, contenu et organisation pédagogique de la formation.', {
    x: MARGIN,
    y: PAGE_HEIGHT - 162,
    size: 8,
    font: theme.regular,
    color: theme.muted
  });
  page.drawRectangle({ x: MARGIN, y: PAGE_HEIGHT - 179, width: 58, height: 3, color: theme.accent });
  return PAGE_HEIGHT - 202;
}

function drawSectionLabel(page: PDFPage, theme: TrainingPdfTheme, title: string, y: number, eyebrow?: string) {
  if (eyebrow) {
    drawTrainingPdfText(page, eyebrow.toUpperCase(), {
      x: MARGIN,
      y,
      size: 5.5,
      font: theme.bold,
      color: theme.accent
    });
  }
  drawTrainingPdfText(page, title, {
    x: MARGIN,
    y: y - (eyebrow ? 14 : 0),
    size: 12.2,
    font: theme.bold,
    color: theme.dark
  });
  return y - (eyebrow ? 34 : 20);
}

function drawMetric(page: PDFPage, theme: TrainingPdfTheme, x: number, y: number, width: number, label: string, value: unknown, emphasized = false) {
  page.drawRectangle({
    x,
    y: y - 62,
    width,
    height: 62,
    color: emphasized ? theme.accent : theme.accentPale,
    opacity: emphasized ? 1 : 0.58
  });
  drawTrainingPdfText(page, label.toUpperCase(), {
    x: x + 10,
    y: y - 17,
    size: 5.2,
    font: theme.bold,
    color: emphasized ? rgb(1, 1, 1) : theme.accent
  });
  const lines = wrapTrainingPdfText(value || '-', theme.bold, 8.2, width - 20).slice(0, 2);
  lines.forEach((line, index) => drawTrainingPdfText(page, line, {
    x: x + 10,
    y: y - 38 - index * 10,
    size: 8.2,
    font: theme.bold,
    color: emphasized ? rgb(1, 1, 1) : theme.dark
  }));
}

function drawAudienceCard(
  page: PDFPage,
  theme: TrainingPdfTheme,
  input: { x: number; y: number; width: number; title: string; value: unknown }
) {
  page.drawRectangle({ x: input.x, y: input.y - 112, width: input.width, height: 112, color: theme.surface });
  page.drawRectangle({ x: input.x, y: input.y - 4, width: 32, height: 4, color: theme.accent });
  drawTrainingPdfText(page, input.title.toUpperCase(), {
    x: input.x + 12,
    y: input.y - 21,
    size: 5.6,
    font: theme.bold,
    color: theme.accent
  });
  const lines = wrapTrainingPdfText(input.value || '-', theme.regular, 7.1, input.width - 24).slice(0, 7);
  lines.forEach((line, index) => drawTrainingPdfText(page, line, {
    x: input.x + 12,
    y: input.y - 43 - index * 9.4,
    size: 7.1,
    font: theme.regular,
    color: theme.muted
  }));
}

function drawEditorialBlock(
  page: PDFPage,
  theme: TrainingPdfTheme,
  input: { y: number; title: string; lines: string[]; accent?: boolean; lineHeight?: number }
) {
  const lineHeight = input.lineHeight ?? 10.5;
  const height = 34 + Math.max(1, input.lines.length) * lineHeight + 12;
  if (input.accent) {
    page.drawRectangle({ x: MARGIN, y: input.y - height, width: CONTENT_WIDTH, height, color: theme.surface });
    page.drawRectangle({ x: MARGIN, y: input.y - height, width: 4, height, color: theme.accent });
  }
  drawTrainingPdfText(page, input.title, {
    x: MARGIN + (input.accent ? 16 : 0),
    y: input.y - 16,
    size: 8.4,
    font: theme.bold,
    color: theme.dark
  });
  input.lines.forEach((line, index) => drawTrainingPdfText(page, line || ' ', {
    x: MARGIN + (input.accent ? 16 : 0),
    y: input.y - 36 - index * lineHeight,
    size: 7.35,
    font: theme.regular,
    color: theme.muted
  }));
  if (!input.accent) {
    page.drawLine({
      start: { x: MARGIN, y: input.y - height + 2 },
      end: { x: PAGE_WIDTH - MARGIN, y: input.y - height + 2 },
      thickness: 0.55,
      color: theme.line
    });
  }
  return input.y - height;
}

export async function generatePremiumTrainingProgramPdf(input: ProgramPdfInput) {
  const { organization, program, trainers } = input;
  const theme = await createTrainingPdfTheme(organization);
  const pages: PageState[] = [];
  const versionDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(program.updated_at || program.created_at));

  const addPage = (continuation = false) => {
    const page = theme.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const number = pages.length + 1;
    const y = drawProgramHeader(page, theme, organization, program, versionDate, continuation, number);
    const state = { page, y, number };
    pages.push(state);
    return state;
  };

  let state = addPage();
  const ensure = (height: number) => {
    if (state.y - height < BOTTOM_LIMIT) state = addPage(true);
  };

  state.y = drawSectionLabel(state.page, theme, program.title, state.y, 'LA FORMATION');
  const introduction = program.description || program.objectives || 'Programme pédagogique de la formation.';
  const introLines = wrapTrainingPdfText(introduction, theme.regular, 7.55, CONTENT_WIDTH - 32).slice(0, 8);
  const introHeight = 40 + introLines.length * 10.5;
  state.page.drawRectangle({ x: MARGIN, y: state.y - introHeight, width: CONTENT_WIDTH, height: introHeight, color: theme.surface });
  state.page.drawRectangle({ x: MARGIN, y: state.y - introHeight, width: 4, height: introHeight, color: theme.accent });
  introLines.forEach((line, index) => drawTrainingPdfText(state.page, line, {
    x: MARGIN + 16,
    y: state.y - 24 - index * 10.5,
    size: 7.55,
    font: theme.regular,
    color: theme.muted
  }));
  state.y -= introHeight + 16;

  const metricGap = 8;
  const metricWidth = (CONTENT_WIDTH - metricGap * 3) / 4;
  const metrics: Array<[string, unknown, boolean]> = [
    ['Durée', `${String(program.duration_hours).replace('.', ',')} heures`, true],
    ['Format', modalityLabels[program.modality], false],
    ['Capacité', `${program.default_capacity} participant${program.default_capacity > 1 ? 's' : ''}`, false],
    ['Tarif indicatif', `${formatTrainingMoney(program.price_excl_tax_cents)} HT`, false]
  ];
  metrics.forEach(([label, value, emphasized], index) => drawMetric(
    state.page,
    theme,
    MARGIN + index * (metricWidth + metricGap),
    state.y,
    metricWidth,
    label,
    value,
    emphasized
  ));
  state.y -= 78;

  ensure(166);
  state.y = drawSectionLabel(state.page, theme, 'À qui s’adresse la formation ?', state.y, 'OBJECTIFS & PUBLIC');
  const cardGap = 9;
  const cardWidth = (CONTENT_WIDTH - cardGap * 2) / 3;
  const cards: Array<[string, unknown]> = [
    ['Objectifs pédagogiques', program.objectives || 'À préciser'],
    ['Public visé', program.audience || 'À préciser'],
    ['Prérequis', program.prerequisites || 'Aucun prérequis spécifique']
  ];
  cards.forEach(([title, value], index) => drawAudienceCard(state.page, theme, {
    x: MARGIN + index * (cardWidth + cardGap),
    y: state.y,
    width: cardWidth,
    title,
    value
  }));
  state.y -= 128;

  state = addPage(true);
  state.y = drawSectionLabel(state.page, theme, 'Parcours pédagogique', state.y, 'CONTENU & MÉTHODES');

  const sections: EditorialSection[] = [
    { title: 'Objectifs pédagogiques', value: program.objectives, eyebrow: 'OBJECTIFS' },
    { title: 'Public visé', value: program.audience, eyebrow: 'PUBLIC' },
    { title: 'Prérequis', value: program.prerequisites, eyebrow: 'PRÉREQUIS' },
    { title: 'Programme détaillé', value: program.detailed_program, eyebrow: 'CONTENU PÉDAGOGIQUE', accent: true },
    { title: 'Méthodes pédagogiques', value: program.teaching_methods, eyebrow: 'MÉTHODES' },
    { title: 'Moyens techniques et ressources', value: program.training_resources, eyebrow: 'RESSOURCES' },
    { title: 'Modalités d’évaluation', value: program.assessment_methods, eyebrow: 'ÉVALUATION', accent: true },
    { title: 'Accessibilité', value: program.accessibility, eyebrow: 'ACCESSIBILITÉ', accent: true }
  ].filter((section) => Boolean(normalizeTrainingPdfText(section.value)));

  for (const section of sections) {
    let remaining = [...wrapTrainingPdfText(section.value, theme.regular, 7.35, CONTENT_WIDTH - (section.accent ? 32 : 0))];
    let continuation = false;
    while (remaining.length) {
      ensure(82);
      if (!continuation && section.eyebrow) {
        drawTrainingPdfText(state.page, section.eyebrow, {
          x: MARGIN,
          y: state.y,
          size: 5.35,
          font: theme.bold,
          color: theme.accent
        });
        state.y -= 14;
      }
      const available = Math.max(58, state.y - BOTTOM_LIMIT - 36);
      const maxLines = Math.max(3, Math.min(27, Math.floor((available - 48) / 10.5)));
      const chunk = remaining.splice(0, maxLines);
      state.y = drawEditorialBlock(state.page, theme, {
        y: state.y,
        title: continuation ? `${section.title} · suite` : section.title,
        lines: chunk,
        accent: Boolean(section.accent)
      }) - 12;
      continuation = remaining.length > 0;
      if (continuation) state = addPage(true);
    }
  }

  ensure(176);
  state.y = drawSectionLabel(state.page, theme, 'Organisation pratique', state.y, 'REPÈRES');
  const trainerNames = trainers.length
    ? trainers.map((trainer) => personName(trainer.first_name, trainer.last_name)).join(', ')
    : 'À définir selon la session';
  const practical: Array<[string, unknown]> = [
    ['Lieu habituel', program.default_location || 'À définir selon la session'],
    ['Formateur(s)', trainerNames],
    ['Code formation', program.code || '-'],
    ['Version du programme', versionDate]
  ];
  const practicalGap = 28;
  const practicalWidth = (CONTENT_WIDTH - practicalGap) / 2;
  practical.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = MARGIN + column * (practicalWidth + practicalGap);
    const y = state.y - row * 56;
    drawTrainingPdfText(state.page, label.toUpperCase(), {
      x,
      y,
      size: 5.3,
      font: theme.bold,
      color: theme.accent
    });
    wrapTrainingPdfText(value, theme.bold, 7.8, practicalWidth).slice(0, 2).forEach((line, lineIndex) => drawTrainingPdfText(state.page, line, {
      x,
      y: y - 18 - lineIndex * 10,
      size: 7.8,
      font: theme.bold,
      color: theme.dark
    }));
    pageDivider(state.page, theme, x, y - 43, practicalWidth);
  });
  state.y -= 126;

  const footerNote = normalizeTrainingPdfText(organization.training_document_footer);
  if (footerNote) {
    ensure(54);
    drawTrainingPdfText(state.page, 'INFORMATIONS UTILES', {
      x: MARGIN,
      y: state.y,
      size: 5.4,
      font: theme.bold,
      color: theme.accent
    });
    wrapTrainingPdfText(footerNote, theme.regular, 6.4, CONTENT_WIDTH).slice(0, 5).forEach((line, index) => drawTrainingPdfText(state.page, line, {
      x: MARGIN,
      y: state.y - 15 - index * 8.4,
      size: 6.4,
      font: theme.regular,
      color: theme.muted
    }));
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
  theme.pdf.setProducer('NCR Suite · Premium editorial program');

  const bytes = await theme.pdf.save();
  const pdfBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return {
    blob: new Blob([pdfBuffer], { type: 'application/pdf' }),
    filename: `programme-${safeTrainingPdfName(program.code || program.title)}.pdf`
  };
}

function pageDivider(page: PDFPage, theme: TrainingPdfTheme, x: number, y: number, width: number) {
  page.drawLine({
    start: { x, y },
    end: { x: x + width, y },
    thickness: 0.55,
    color: theme.line
  });
}
