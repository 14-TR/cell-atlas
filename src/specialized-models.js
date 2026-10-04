const bacteria = 'https://www.ncbi.nlm.nih.gov/books/NBK8477/';
const neuron = 'https://med.uth.edu/nba/nso/s1_cellular-molecular/ch-8-organization-of-cell-types/';
const blood = 'https://www.ncbi.nlm.nih.gov/books/NBK2263/';
const redSkeleton = 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11105037/';
export const specializedSources = {
  blood: {title:'Blood and the cells it contains — NCBI Bookshelf',url:blood},
  redSkeleton: {title:'Human erythrocytes: cytoskeleton and its origin',url:redSkeleton},
  neuron: {title:'Neuroscience Online: organization of cell types — UTHealth',url:neuron},
  bacteria: {title:'Bacterial structure — Medical Microbiology (NCBI Bookshelf)',url:bacteria},
};
const limits = 'Not a measured reconstruction. False colors identify structures; counts and placement are illustrative. Tiny features and membrane spacing are exaggerated. No exact scale is implied.';
const part = (id,name,color,fn,description,detail,sources,membranes=0) => ({id,name,color,function:fn,eyebrow:fn,description,detail,sources,membranes});
export const specializedModels = {
  'red-blood-cell': {
    id:'red-blood-cell',name:'Red blood cell · human',cellType:'mature human red blood cell (erythrocyte)',caption:'RED BLOOD CELL',phase:'MATURE HUMAN',seed:240922,
    measuredReconstruction:false,exactScale:false,defaultSelection:'membrane',
    disclaimer:`A mature human erythrocyte, not an immature reticulocyte or the nucleated red cell of a bird. ${limits} The resting biconcave shape is idealized; an artificial transparent sector reveals enlarged hemoglobin and a simplified membrane skeleton.`,
    accuracy:'A biconcave disc, not a ring with a hole. A normal mature human red blood cell has no nucleus, mitochondria, ER, Golgi or ribosomes. It carries hemoglobin in cytosol and retains a flexible membrane skeleton. This is not a disease model.',
    labels:[{id:'membrane',text:'Biconcave membrane',point:[-2,3.5,1]},{id:'hemoglobin',text:'Hemoglobin',point:[0,0,.7]},{id:'cytoskeleton',text:'Membrane skeleton',point:[3,-2,1]}],
    structures:[
      part('membrane','Biconcave membrane','#cb7471','Provides a flexible gas-exchange surface','A mature human erythrocyte is a biconcave disc: both broad faces are depressed centrally, but there is no central hole. Its plasma membrane and underlying skeleton support deformation in narrow vessels. Transparency is a display convention, not the natural appearance.','Orbit to the side to see the thinner center and thicker shoulder. The cell is not a torus.',[blood,redSkeleton],1),
      part('hemoglobin','Hemoglobin','#e5a092','Binds and transports oxygen','Hemoglobin is a soluble oxygen-binding protein abundant in erythrocyte cytosol. Adult hemoglobin commonly has four globin subunits, each with an iron-containing heme. Enlarged four-bead clusters symbolize this protein; they are not organelles or a molecular reconstruction.','The small rose-colored clusters inside the disc represent hemoglobin, not free ribosomes.',[blood]),
      part('cytoskeleton','Membrane skeleton','#dec2a0','Supports shape and reversible deformation','A spectrin-based network linked to short actin filaments and membrane proteins supports the erythrocyte membrane. This mesh helps the cell deform while preserving integrity. The sparse curved grid is enlarged and simplified; it is not an actual molecular lattice.','Fine gold tracks lie just below the membrane on both faces. There is no microtubule spindle.',[redSkeleton]),
    ],
  },
  neuron: {
    id:'neuron',name:'Neuron · multipolar',cellType:'generalized mammalian multipolar neuron with an unmyelinated axon',caption:'NEURON',phase:'MULTIPOLAR',seed:240921,
    measuredReconstruction:false,exactScale:false,defaultSelection:'dendrites',
    disclaimer:`A generalized mammalian multipolar neuron with an unmyelinated, shortened axon. ${limits} This is not a reconstruction of a particular brain region. Glial cells and synaptic partners are omitted; not all neurons share this shape.`,
    accuracy:'Branched dendrites surround a soma containing a nucleus and Nissl substance. One continuous axon leads to terminal branches. Myelin is omitted, not attributed to the neuron: where present, it is made by glial cells. Many soma organelles and molecular channels are omitted.',
    labels:[{id:'dendrites',text:'Dendrites',point:[-4.8,3.5,.1]},{id:'nucleus',text:'Soma & nucleus',point:[-2,.8,1]},{id:'axon',text:'Axon',point:[3,-.5,.2]}],
    structures:[
      part('dendrites','Dendrites','#a7c7ac','Receives and integrates synaptic inputs','Dendrites are branching extensions of the neuronal cell body. Their surfaces receive many synaptic inputs, often on small spines. This simplified tree has no reconstructed synapses and omits fine spines. Its branch count is illustrative, not a neuron classification criterion.','The branching green processes spread from the left side of the soma. They are not separate cells.',[neuron]),
      part('axon','Axon','#cba876','Conducts signals toward nerve endings','One axon extends continuously from the soma through its initial region to a terminal arbor. This axon is unmyelinated and greatly shortened to fit the view. Many neurons instead have myelin supplied by glial cells; absence here is an explicit specimen choice.','Trace the gold process from the soma to the right. No impulse animation or conduction speed is claimed.',[neuron]),
      part('terminals','Axon terminals','#e0bd89','Releases signals at specialized nerve endings','The axon branches into small terminal boutons. In chemical synapses, vesicles release neurotransmitters across a cleft to a receiving cell. Enlarged terminal beads suggest those endings; the receiving cells, clefts and vesicle machinery are not reconstructed.','Gold swellings terminate the right-hand branches. They are enlarged endings, not nuclei.',[neuron]),
      part('nucleus','Nucleus','#b498ca','Houses the neuronal genome','The soma contains the nucleus, where most of the neuronal genome resides. The simplified purple envelope has an artificial opening that reveals a nucleolus. Unlike a mature red blood cell, this neuron retains its nucleus. Chromatin and nuclear pore complexes are omitted here.','The violet central body and pink nucleolar bead are inside the cell body.',[neuron],2),
      part('nissl','Nissl substance','#8e9fc8','Supports protein synthesis in the soma','Nissl substance corresponds to prominent rough endoplasmic reticulum and ribosomes in the soma and proximal dendrites. Stylized sheets with attached beads are shown only in the soma, not along the axon. The ER network and its connections are simplified.','Blue sheets and tiny pale beads flank the nucleus; no sheets are placed in the axon.',[neuron],1),
      part('mitochondria','Mitochondria','#cb8b74','Supports the energy demands of signaling','Mitochondria supply energy for neuronal functions and occur in the soma and processes. The elongated orange bodies are a small illustrative sample, including one along the axon. Internal cristae and molecular transport are not resolved in this overview.','Orange ellipsoids occupy the soma and axon, not the nucleus.',[neuron],2),
      part('membrane','Soma membrane','#82b9b5','Separates the cell body from its surroundings','The plasma membrane encloses the soma and continues into dendrites and the axon. For selection, the branch surfaces are grouped with their respective processes; the membrane toggle hides only this soma shell. Its display window is not a natural hole.','The translucent teal soma shell surrounds the nucleus and Nissl sheets. Branch surfaces meet this shell.',[neuron],1),
    ],
  },
  bacterium: {
    id:'bacterium', name:'Bacterium · E. coli', cellType:'motile Escherichia coli vegetative cell', caption:'E. COLI', phase:'PROKARYOTE', seed:240920,
    measuredReconstruction:false, exactScale:false, defaultSelection:'nucleoid',
    disclaimer:`A motile Escherichia coli vegetative cell, not every bacterium or every E. coli strain. ${limits} Flagella are shortened; capsule, pili and optional plasmids are omitted. No division septum is shown.`,
    accuracy:'A Gram-negative rod: inner plasma membrane, thin peptidoglycan in the periplasm, and an outer membrane. DNA is in an unenclosed nucleoid; there is no nucleus, ER, Golgi or mitochondrion. All three envelope layers have an artificial display window.',
    labels:[{id:'nucleoid',text:'Nucleoid',point:[0,.6,1]},{id:'cell-wall',text:'Peptidoglycan',point:[-2,-1.9,0]},{id:'flagella',text:'Flagella',point:[3,3,-.4]}],
    structures:[
      part('nucleoid','Nucleoid','#c1a0d1','Organizes the bacterial chromosome','The E. coli chromosome occupies a nucleoid without a surrounding nuclear membrane. The folded fiber suggests compacted circular DNA, not a eukaryotic nucleus. Genome copy number and arrangement depend on growth and replication; this drawing is not a chromosome map.','The lavender closed fiber sits directly in the cytoplasm. No nuclear envelope surrounds it.',[bacteria]),
      part('ribosomes','70S ribosomes','#e0c59c','Builds proteins in the cytoplasm','Bacterial ribosomes contain 30S and 50S subunits that together form a 70S ribosome; S values describe sedimentation, not additive size. They are not attached to an endoplasmic reticulum. Enlarged paired beads stand for a much denser, variable population.','Small paired gold particles sit around the nucleoid. Their number is an illustration choice.',[bacteria]),
      part('membrane','Plasma membrane','#79b5af','Controls exchange and supports energy transduction','The inner plasma membrane is a selective lipid bilayer and a site of energy-transducing reactions. E. coli has no mitochondria: respiratory machinery is in this membrane. The wide display opening and layer spacing are artificial.','The innermost teal shell lies inside peptidoglycan, separate from the outer membrane.',[bacteria],1),
      part('cell-wall','Peptidoglycan wall','#d6bc82','Maintains shape and resists osmotic pressure','A thin peptidoglycan network supports the Gram-negative cell in the periplasm between inner and outer membranes. It is a wall, not a third lipid membrane, and is not the cellulose wall of plants. Its thickness and mesh are enlarged here.','The gold mesh and rim between the two teal boundaries represent peptidoglycan.',[bacteria]),
      part('outer-membrane','Outer membrane','#8ca8c8','Provides an additional permeability barrier','The Gram-negative outer membrane is distinct from the inner plasma membrane. Its outer leaflet contains lipopolysaccharide and its proteins include porins. Molecular LPS and porin structures are omitted; the outer shell is a simplified barrier.','The outer blue shell encloses the wall and plasma membrane. It is not a capsule.',[bacteria],1),
      part('flagella','Flagella','#b8d0af','Propels a motile bacterium','Motile E. coli can have flagella distributed across the cell surface (peritrichous flagellation). Rotary motors drive helical protein filaments. The short curved threads here are stationary and exaggerated in thickness; strain and growth conditions affect flagellation.','Several helical filaments originate at different surface sites. This is not a single polar flagellum.',[bacteria]),
    ],
  },
};
