import { structures as mammalianStructures, model as mammalianModel, sources } from './data.js';
import { specializedModels, specializedSources } from './specialized-models.js';

// Shared field notes describe conserved eukaryotic structures. Overrides below
// keep taxon-specific anatomy out of the other models, without editing mammals.
export const modelSources = {
  ...sources, ...specializedSources,
  plantWall: { title: 'The plant cell wall—dynamic, strong, and adaptable (Plant Cell)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11062476/' },
  chloroplast: { title: 'Chloroplast evolution, structure and functions', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4075315/' },
  plantVacuole: { title: 'A Review of Plant Vacuoles: Formation, Located Proteins, and Functions', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6783984/' },
  vacuoles: { title: 'Plant and fungal vacuoles — Molecular Biology of the Cell', url: 'https://www.ncbi.nlm.nih.gov/books/NBK26844/' },
  peroxisomes: { title: 'Peroxisomes — Molecular Biology of the Cell', url: 'https://www.ncbi.nlm.nih.gov/books/NBK26858/' },
  yeastWall: { title: 'Architecture and Biosynthesis of the Saccharomyces cerevisiae Cell Wall (Genetics)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3522159/' },
  yeastGolgi: { title: 'The yeast Golgi apparatus: insights and mysteries', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2788027/' },
};
const refs = (...keys) => keys.map(key => modelSources[key].url);
const common = (overrides) => mammalianStructures.filter(s => s.id !== 'lysosomes').map(s => ({ ...s, ...overrides[s.id] }));
const endosomes = {
  description: 'Endosomes sort internalized membrane and cargo for recycling or delivery to the lytic vacuole. The blue compartments with internal vesicles illustrate a multivesicular late-endosome-like form, not every endosomal compartment. Plant and yeast trafficking differ in detail from animal pathways.',
  detail: 'Blue compartments contain small internal vesicles. Degradative traffic leads toward the vacuole, not separate animal-style lysosomes.',
  sources: refs('vacuoles', 'plantVacuole'),
};
const wall = {
  id: 'cell-wall', name: 'Cell wall', eyebrow: 'Extracellular support', color: '#c8ba86', function: 'Supports and protects the cell outside its plasma membrane',
  membranes: 0,
};
const vacuole = {
  id: 'vacuole', name: 'Central vacuole', eyebrow: 'Storage, pressure & recycling', color: '#89b9c8', function: 'Stores solutes, supports turgor and recycles material', membranes: 1,
};
const plantStructures = common({
  golgi: {
    name: 'Golgi stacks',
    description: 'Plant Golgi cisternae form discrete stacks, often called dictyosomes, distributed through the cytoplasm. They modify and sort secretory cargo, including components destined for the cell wall. Two small stacks with associated vesicles stand in for a variable population; they are not a mammalian perinuclear ribbon.',
    detail: 'Look for two small ochre stacks at the cell periphery. Ribosomes are on the ER, never in the Golgi lumen.',
    sources: refs('yeastGolgi', 'plantWall'),
  },
  peroxisomes: {
    description: 'Single-membrane peroxisomes carry out oxidative reactions and handle hydrogen peroxide through enzymes including catalase. In photosynthetic tissues they participate in photorespiration, alongside chloroplasts and mitochondria. Functions and abundance vary with tissue and growth conditions.',
    sources: refs('peroxisomes'),
  },
  endosomes,
  cytoskeleton: {
    description: 'Actin filaments and microtubules organize the plant cytoplasm. Cortical microtubules help guide patterns of cellulose deposition, while actin supports intracellular transport. The peripheral tracks are an illustrative arrangement, not measured filaments or a molecular reconstruction.',
    detail: 'Fine curved tracks follow the inside of the wall, around rather than through the central vacuole.',
    sources: refs('plantWall', 'compartments'),
  },
  membrane: {
    description: 'A selective lipid bilayer lies immediately inside the cell wall. The wall and membrane are different structures: the membrane controls exchange, while the wall supplies extracellular support. The paired enlarged rims mark one bilayer, not two separate membranes. Both boundaries have permanent display windows.',
    detail: 'The thin teal inner boundary sits within the thicker gold-green cell wall. Each can be hidden independently in View settings.',
    sources: refs('plantWall', 'compartments'),
  },
});
plantStructures.splice(6, 0,
  { id: 'chloroplasts', name: 'Chloroplasts', eyebrow: 'Light to chemical energy', color: '#91bd70', function: 'Use light energy to support carbon fixation',
    description: 'A double-membrane envelope surrounds each chloroplast. Internal thylakoid membranes form stacks called grana, linked by stroma lamellae and surrounded by the stroma. The thylakoids are a distinct membrane system, not folds of the inner envelope. This photosynthetic plant cell also has mitochondria; not every plant cell contains chloroplasts.',
    detail: 'Green cutaways expose repeated thylakoid discs, connecting lamellae and paired envelope rims. Stacks, spacing and counts are stylized, not molecular geometry.',
    sources: refs('chloroplast'), membranes: 2, thylakoids: 'distinct internal membrane system' },
  { ...vacuole,
    description: 'The central vacuole is bounded by one membrane, the tonoplast. Water and solute storage help maintain turgor against the cell wall; lytic functions recycle cellular material. The large fluid-filled compartment displaces much of the cytoplasm and nucleus toward the periphery. Size varies with cell type and state, and the display opening is artificial.',
    detail: 'The large pale-blue compartment occupies the center. Other organelles lie outside its tonoplast, in the surrounding cytoplasm.',
    sources: refs('plantVacuole', 'vacuoles') },
  { ...wall,
    description: 'The primary cell wall is an extracellular network of cellulose microfibrils, hemicelluloses, pectins and proteins. It supports the cell against turgor while permitting growth. The rounded, box-like shell is an illustrative plant outline, not a universal plant cell shape. Wall fibers and thickness are exaggerated; adjacent cells and plasmodesmata are not modeled.',
    detail: 'The thick gold-green outer rim and crossing fibers sit outside the plasma membrane. This is a primary wall, not a lignified woody secondary wall.',
    sources: refs('plantWall'), composition: 'cellulose, hemicelluloses, pectins and proteins' },
);
const fungalStructures = common({
  golgi: {
    name: 'Golgi cisternae',
    description: 'In Saccharomyces cerevisiae, the Golgi usually consists of dispersed, unstacked individual cisternae rather than the ordered stacks seen in many other eukaryotes. These compartments mature as they modify and sort cargo. The separated ochre discs and vesicles illustrate this yeast-specific arrangement, not all fungal Golgi architecture.',
    detail: 'Find the scattered single cisternae, including one in the growing bud. They are not a six-layer mammalian Golgi stack.',
    sources: refs('yeastGolgi'),
  },
  peroxisomes: {
    description: 'Single-membrane yeast peroxisomes support oxidative metabolism, including fatty-acid breakdown and hydrogen-peroxide handling. Their abundance depends strongly on the carbon source and growth conditions. The small granular compartments are illustrative and do not imply a fixed population or universal crystalline core.',
    sources: refs('peroxisomes'),
  },
  endosomes: { ...endosomes, sources: refs('vacuoles', 'yeastGolgi') },
  cytoskeleton: {
    description: 'Actin cables and cortical actin organization support polarized growth and transport toward the bud in budding yeast. Microtubules help position the nucleus and organize chromosome segregation during division. This early-budded interphase illustration shows peripheral transport tracks, not a mitotic spindle or a reconstructed molecular network.',
    detail: 'Thin tracks follow the mother-cell cortex and approach the bud neck. The cell-cycle machinery is simplified, not animated.',
    sources: refs('yeastGolgi', 'yeastWall'),
  },
  membrane: {
    description: 'The selective plasma membrane is a lipid bilayer beneath the fungal wall and continues into the growing bud. The cell wall is not a membrane. The open front and exaggerated paired rim expose the interior for study; these display windows do not represent natural holes in a living yeast cell.',
    detail: 'The thin teal boundary follows the mother cell, narrow neck and bud, inside the thicker fungal wall.',
    sources: refs('yeastWall', 'compartments'),
  },
});
fungalStructures.splice(6, 0,
  { ...vacuole, name: 'Vacuole', function: 'Degrades cargo and stores ions and metabolites',
    description: 'The yeast vacuole is an acidic, single-membrane compartment with lysosome-like degradative functions as well as roles in storage and homeostasis. Vacuoles can fuse or fragment as conditions change. One large mother-cell vacuole is shown; vacuole inheritance into the growing bud is not reconstructed.',
    detail: 'The pale-blue compartment contains stylized degradative cargo. It is not a chloroplast or a plant-specific central vacuole.',
    sources: refs('vacuoles') },
  { ...wall, color: '#ceac86',
    description: 'The Saccharomyces cerevisiae cell wall contains beta-glucans, mannoproteins and a smaller amount of chitin. It provides mechanical and osmotic protection outside the plasma membrane. This is not a cellulose plant wall. The continuous mother-and-bud outline and enlarged fibrous layers are display conventions, not a measured ultrastructure.',
    detail: 'The warm outer boundary extends into the bud. Its separation from the plasma membrane is exaggerated to distinguish the layers.',
    sources: refs('yeastWall'), composition: 'beta-glucans, mannoproteins and chitin' },
  { id: 'bud-neck', name: 'Bud neck & scars', eyebrow: 'Polarized growth', color: '#e1c89b', function: 'Marks the growing bud and previous divisions',
    description: 'Chitin is concentrated at the neck between the mother cell and an emerging bud, and in division septa and bud scars. The neck ring here surrounds an open cytoplasmic connection; no completed septum is shown. Separate surface rings suggest scars of previous divisions. This early bud is not a separate mature daughter cell, and no mitotic spindle is depicted.',
    detail: 'Follow the narrow connection to the smaller bud on the right, and the older ring-like marks on the mother-cell wall.',
    sources: refs('yeastWall'), membranes: 0 },
);
const limits = 'Not a measured reconstruction. False colors identify structures; counts and placement are illustrative. Tiny features, membrane spacing and thickness are exaggerated for legibility. No exact scale is implied.';
export const cellModels = {
  mammalian: { ...mammalianModel, id: 'mammalian', name: 'Mammalian cell', caption: 'MAMMALIAN CELL', phase: 'INTERPHASE', defaultSelection: 'nucleus', structures: mammalianStructures,
    accuracy: 'A mammalian cell: no cell wall, chloroplasts or central plant vacuole.',
    labels: [{ id: 'nucleus', text: 'Nucleus', point: [-2.2,2.9,1] }, { id: 'golgi', text: 'Golgi', point: [3.6,3.2,1.6] }, { id: 'mitochondria', text: 'Mitochondrion', point: [4.4,-1.5,2.7] }] },
  plant: { id: 'plant', name: 'Plant cell', cellType: 'generalized photosynthetic plant interphase cell', caption: 'PLANT CELL', phase: 'PHOTOSYNTHETIC', seed: 240918, measuredReconstruction: false, exactScale: false,
    disclaimer: `A generalized photosynthetic plant interphase cell. ${limits} Not all plant cells contain chloroplasts; this is not a root cell or a model of every plant tissue.`,
    accuracy: 'A photosynthetic plant cell: primary cellulose-rich wall, chloroplasts with a separate thylakoid system, and a large tonoplast-bounded vacuole. Organelles occupy peripheral cytoplasm. Adjacent cells and plasmodesmata are omitted.',
    structures: plantStructures, defaultSelection: 'chloroplasts', labels: [{ id: 'nucleus', text: 'Nucleus' }, { id: 'chloroplasts', text: 'Chloroplast' }, { id: 'vacuole', text: 'Central vacuole' }] },
  fungal: { id: 'fungal', name: 'Fungal cell · yeast', cellType: 'early-budded Saccharomyces cerevisiae interphase cell', caption: 'FUNGAL CELL', phase: 'BUDDING YEAST', seed: 240919, measuredReconstruction: false, exactScale: false,
    disclaimer: `An early-budded Saccharomyces cerevisiae interphase cell, not a representation of all fungi or a hyphal mold. ${limits} Bud size and scars are illustrative, not a timed cell-cycle reconstruction.`,
    accuracy: 'A budding yeast, not all fungi: a glucan/mannoprotein/chitin wall, lytic vacuole, open bud neck and dispersed unstacked Golgi cisternae. No chloroplasts, cellulose plant wall, completed septum or mitotic spindle. Organelle inheritance is simplified.',
    structures: fungalStructures, defaultSelection: 'vacuole', labels: [{ id: 'nucleus', text: 'Nucleus' }, { id: 'vacuole', text: 'Vacuole' }, { id: 'bud-neck', text: 'Bud neck' }] },
  ...specializedModels,
};
export function getCellModel(id = 'mammalian') {
  if (!Object.hasOwn(cellModels, id)) throw new Error(`Unknown cell model: ${id}`);
  return cellModels[id];
}
