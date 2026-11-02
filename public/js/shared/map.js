// The map being played. Everything imports MAP; switching maps swaps its contents in place,
// so those references stay valid.
import { YARD } from './maps/yard.js';
import { DEPOT } from './maps/depot.js';

export const MAPS = { yard: YARD, depot: DEPOT };
export const MAP_ORDER = ['yard', 'depot'];

export const MAP = { ...YARD };

export function setMap(id) {
  if (!MAPS[id]) return false;
  Object.assign(MAP, MAPS[id]);
  return true;
}
