export const CHARACTERS = [
  { name: 'Harry Du Bois', tagVariants: ['harry du bois', 'harry dubois'] },
  { name: 'Kim Kitsuragi', tagVariants: ['kim kitsuragi'] },
  { name: 'Evrart Claire', tagVariants: ['evrart claire'] },
  { name: 'Titus Hardie', tagVariants: ['titus hardie'] },
  { name: 'Gaston Martin', tagVariants: ['gaston martin'] },
  { name: 'Jean Vicquemare', tagVariants: ['jean vicquemare'] },
  { name: 'Ruby the Instigator', tagVariants: ['ruby the instigator'] },
  { name: 'Klaasje Amandou', tagVariants: ['klaasje amandou'] },
  { name: 'Alice Demettrie', tagVariants: ['alice demettrie'] },
  { name: 'Ptolemy Pryce', tagVariants: ['ptolemy pryce'] },
  { name: 'Cuno de Ruyter', tagVariants: ['cuno de ruyter'] },
];

function normalizeTag(rawTag) {
  return rawTag.trim().toLowerCase();
}

function postMentionsCharacter(post, character) {
  const normalizedPostTags = (post.tags || []).map(normalizeTag);
  return character.tagVariants.some(variant => normalizedPostTags.includes(variant));
}

export function countPostsByCharacter(posts) {
  const countsByCharacter = CHARACTERS.map(character => ({
    name: character.name,
    count: posts.filter(post => postMentionsCharacter(post, character)).length,
  }));

  return countsByCharacter.sort((a, b) => b.count - a.count);
}
