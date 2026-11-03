// The map being played. Everything imports MAP; switching maps swaps its contents in place,
// so those references stay valid.
import { YARD } from './maps/yard.js';
import { DEPOT } from './maps/depot.js';
import { PLAZA } from './maps/plaza.js';
import { OLDTOWN } from './maps/oldtown.js';
import { VILLA } from './maps/villa.js';

export const MAPS = { yard: YARD, depot: DEPOT, plaza: PLAZA, oldtown: OLDTOWN, villa: VILLA };
export const MAP_ORDER = ['yard', 'depot', 'plaza', 'oldtown', 'villa'];

export const MAP = { ...YARD };

export function setMap(id) {
  if (!MAPS[id]) return false;
  Object.assign(MAP, { decals: [], props: [] }, MAPS[id]); // maps without ground cover or props mustn't keep the last one's
  return true;
}
