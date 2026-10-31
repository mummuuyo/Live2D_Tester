import type { SheetModel } from '../types';

export const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vS2NDhCP2o9MnNtPAiyt9wWa7tppzJuciYKwC1KI3B0W9DYDNLKNUVvSgUJt_q3ujfwCiHNWjalrlqQ/pub?gid=0&single=true&output=csv';

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { current += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
    } else current += ch;
  }
  cells.push(current.trim());
  return cells;
}

export function parseCsv(text: string): SheetModel[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/\s/g, ''));
  const nickIndex = headers.findIndex(h => ['닉네임', 'nickname', 'name'].includes(h));
  const urlIndex = headers.findIndex(h => ['구글드라이브주소', '구글드라이브링크', 'googledriveurl', 'driveurl', 'url'].includes(h));
  if (nickIndex < 0 || urlIndex < 0) throw new Error('CSV 첫 행에서 "닉네임"과 "구글 드라이브 주소" 열을 찾지 못했습니다.');

  return lines.slice(1).map((line, index) => {
    const cells = parseCsvLine(line);
    const nickname = (cells[nickIndex] || '').trim();
    const driveUrl = (cells[urlIndex] || '').trim();
    if (!nickname || !driveUrl) return null;
    const match = driveUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    return { id: `${index}-${match?.[1] || driveUrl}`, nickname, driveUrl, folderId: match?.[1] || null };
  }).filter((item): item is SheetModel => Boolean(item));
}

export async function loadSheetModels(): Promise<SheetModel[]> {
  const response = await fetch(SHEET_CSV_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Google Sheets CSV를 읽지 못했습니다 (HTTP ${response.status}).`);
  const text = await response.text();
  if (text.trimStart().startsWith('<!DOCTYPE html') || text.trimStart().startsWith('<html')) {
    throw new Error('CSV 대신 HTML 페이지가 반환되었습니다. 시트가 웹에 게시되어 있는지 확인해 주세요.');
  }
  return parseCsv(text);
}
