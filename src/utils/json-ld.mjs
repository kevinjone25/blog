// Escapes the characters that could end a <script> element or break JS parsing.
const BS = String.fromCharCode(92)
const ESCAPES = {
  '<': `${BS}u003c`,
  '>': `${BS}u003e`,
  '&': `${BS}u0026`,
  '\u2028': `${BS}u2028`,
  '\u2029': `${BS}u2029`
}

export const serializeJsonLd = (value) =>
  JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (ch) => ESCAPES[ch])
