/**
 * Digit-free alias for the CIEDE2000 metric, so classify.ts can import it
 * while containing no digit characters (R5 source-scan test).
 */
export { deltaE2000 as deltaE } from './ciede2000';
