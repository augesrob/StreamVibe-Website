/**
 * StreamVibe Live Words — Word Dictionary & Helpers
 * ~3300+ common English words for in-game validation.
 */

const RAW = [
  // 3-letter
  'ace','act','add','age','ago','aid','aim','air','ale','all','and','ant','ape','arc','are','ark','arm','art','ash','ask',
  'ate','awe','axe','aye','bad','bag','ban','bar','bat','bay','bed','bet','big','bin','bit','bog','bow','box','boy','bud',
  'bug','bun','bus','but','buy','cab','can','cap','car','cat','cob','cod','cog','cop','cot','cow','cry','cub','cup','cut',
  'dab','dad','dam','day','den','dew','did','dig','dim','dip','dog','dot','dry','dub','dug','dun','ear','eat','egg','ego',
  'elf','elm','end','era','eve','ewe','eye','fan','far','fat','fax','fed','few','fig','fin','fit','fix','fly','fog','for',
  'fox','fry','fun','fur','gap','gas','gem','get','god','got','gum','gun','gut','had','ham','has','hat','hay','her','hew',
  'him','hip','his','hit','hog','hop','hot','how','hub','hug','hum','hut','ice','ill','imp','ink','inn','ion','ire','its',
  'ivy','jab','jam','jar','jaw','jet','job','jog','joy','jug','jut','keg','key','kid','kin','kit','lab','lag','lap','law',
  'lax','lay','led','leg','let','lid','lip','lit','log','low','lug','mad','man','map','mar','mat','men','met','mix','mob',
  'mod','mom','mop','mud','mug','nab','nag','nap','net','new','nod','nor','not','now','nun','nut','oak','oar','odd','off',
  'oil','old','orb','ore','our','out','owe','owl','own','pad','pan','pat','pay','peg','pen','pet','pie','pig','pin','pit',
  'ply','pod','pop','pot','pro','pub','pun','pup','put','rag','ram','ran','rap','rat','ray','red','ref','rep','rut','rye',
  'sac','sag','sap','sat','saw','say','set','sew','shy','sin','sip','sir','sit','six','ski','sky','sly','sob','sod','son',
  'sow','spa','spy','sty','sub','sue','sum','sun','tab','tan','tap','tar','tax','tin','tip','tog','ton','too','top','toy',
  'try','tub','tug','two','urn','use','van','vat','via','vow','war','was','wax','web','wed','wet','who','wig','win','wit',
  'woe','wok','won','woo','yam','yew','you','zap','zen','zip',
  // 4-letter
  'able','ache','acid','acre','also','arch','area','army','aunt','auto','away','bake','bald','ball','band','bane','bang',
  'bank','bare','bark','barn','base','bash','bask','bead','beam','bean','bear','beat','been','bell','belt','bend','best',
  'bind','bird','bite','blot','blow','blue','blur','boar','boil','bold','bolt','bomb','bond','bone','boon','boot','bore',
  'born','both','bout','bowl','brag','bran','bray','brew','brim','brow','buck','bulk','bull','bump','burn','burp','bury',
  'bush','buzz','cage','cake','calf','call','calm','came','camp','cane','care','cart','case','cash','cast','cave','cell',
  'chad','chai','chap','char','chat','chef','chin','chip','chop','city','clam','clap','claw','clay','clip','club','clue',
  'coal','coat','code','coil','coin','cold','colt','come','cook','cool','cope','copy','core','corn','cost','cozy','crab',
  'crew','crop','crow','cube','cure','curl','cute','damp','dark','dart','dash','dawn','dead','deal','dean','dear','deck',
  'deed','deep','deer','desk','dial','dice','died','dine','dire','dirt','disc','dish','disk','dock','dome','done','door',
  'dose','dove','down','drab','drag','draw','drip','drop','drum','dual','dude','dull','dump','dune','dusk','dust','duty',
  'each','earn','ease','east','echo','edge','emit','epic','even','ever','evil','exam','face','fact','fade','fail','fair',
  'fake','fall','fame','farm','fast','fate','fawn','fear','feat','feel','felt','fern','file','fill','film','find',
  'fine','fire','firm','fish','fist','flag','flat','flaw','flea','flee','flew','flip','flow','foam','fond','font',
  'food','fool','foot','fore','fork','form','fort','foul','four','free','frog','from','fuel','fume','fund','fuse','fuss',
  'gale','gall','game','gang','gave','gaze','gear','give','glad','glow','glue','gnaw','goat','gold','golf','gone','gore',
  'gown','grab','gram','gray','grim','grin','grip','grew','grit','grow','gulf','gust','hack','hail','hair','half',
  'hall','halt','hand','hang','hard','hare','harm','harp','hash','haul','have','haze','head','heal','heap','heat','heel',
  'held','helm','hemp','herd','hero','hide','high','hill','hire','hold','hole','home','hone','hook','hoop','horn','hose',
  'host','hour','howl','hull','hunt','hurl','hurt','hymn','icon','idea','idle','inch','into','iron','isle','item','jade',
  'jail','jerk','jest','join','joke','jolt','jump','junk','jury','just','keen','keep','kill','kind','king','knob','knot',
  'know','lack','lady','laid','lake','lamb','lamp','land','lane','lark','lash','last','late','laud','lava','lead','leaf',
  'lean','leap','lend','lens','liar','lick','like','lime','line','lion','list','live','load','loaf','loan','lock','loft',
  'lone','long','loom','loop','lore','lose','lost','loud','love','luck','lull','lure','lust','lute',
  'made','maid','mail','main','make','male','mall','mane','many','mark','mars','mast','mate','maze','meal','mean','meet',
  'melt','memo','mere','mesh','mice','mild','mile','mill','mine','mint','miss','mist','mode','mole','moor','more','moss',
  'most','moth','move','much','mule','muse','must','myth','nail','name','nape','navy','near','neck','need','nest','next',
  'nice','nine','node','nook','noon','nose','note','noun','nova','null','obey','once','only','open','oval','over','oven',
  'pace','pack','pact','page','pain','pair','pale','palm','park','part','pass','past','pave','peak','peel','peer','pelt',
  'perk','perm','pest','pick','pile','pill','pink','pipe','plan','play','plea','plow','ploy','plum','plus','poem','poet',
  'pole','poll','pond','pool','poor','pore','pork','port','pose','post','pour','pray','prep','prey','puff','pull','pump',
  'pure','push','quit','quiz','race','rack','raft','rage','raid','rain','rake','ramp','rank','rant','rare','read','real',
  'reap','reed','reel','rely','rent','rest','rice','rich','ride','ring','rink','riot','rise','risk','road','roam','roar',
  'robe','rock','rode','role','roll','roof','room','root','rope','rose','ruin','rule','rush','safe','sage','sake','sale',
  'salt','same','sand','sane','sang','sank','save','seal','seam','seat','seed','seek','seem','seep','self','send','sent',
  'shed','ship','shoe','shop','shot','show','shut','side','sigh','sign','silk','sill','silo','silt','sing','sink','site',
  'size','skin','skip','slab','slap','slid','slim','slip','slit','slob','slop','slot','slow','slum','snap','snob','snug',
  'sock','soda','sofa','soil','sole','some','song','sort','soul','soup','sour','span','spar','spin','spit','spot','stab',
  'star','stay','stem','step','stew','stub','such','suit','sung','sunk','sure','swan','swap','swat','swim','tack','tale',
  'talk','tall','tame','tape','task','team','tear','tell','tent','test','text','than','that','them','then','they','thin',
  'this','thou','tick','tide','tied','tilt','time','tire','toad','told','toll','tomb','tome','took','tool','torn','toss',
  'tour','town','tree','trim','trip','trod','true','tuck','tuft','twig','twin','type','ugly','undo','upon','urea','vain',
  'vale','vamp','vane','veil','vein','verb','vest','veto','void','volt','wade','waft','wake','walk','wane','want','ward',
  'ware','wary','watt','wave','weal','wean','wear','weed','week','weld','wend','wink','wipe','wire','wish','womb','wool',
  'word','wore','worn','writ','yank','yard','yarn','yore','your','zero','zone','zoom',
  // 5-letter
  'snore','snout','snuck','soapy','solar','solid','solve','sorry','space','spade','spare','spark','spawn','speak','spear',
  'specs','speed','spend','spent','spice','spiky','spill','spine','spite','splat','split','spoke','spore','sport','spout',
  'spray','squad','squat','squid','stack','stain','stair','stake','stale','stall','stamp','stand','stark','start','state',
  'stave','steal','steam','steel','steep','steer','stern','stick','stiff','still','sting','stink','stint','stoic','stoke',
  'stone','stood','store','storm','story','stout','stove','straw','stray','strip','stuck','study','stuff','stump','stung',
  'stunk','swept','swift','swill','swirl','sword','swore','sworn','syrup','taboo','talon','tangy','tapir','taste','tatty',
  'taunt','tawny','teach','tense','tenth','tepid','terms','terse','theft','their','there','these','thick','thing','think',
  'thorn','three','threw','throw','thumb','tiara','tiger','tight','tiled','title','today','token','toxic','trace','track',
  'trade','trail','train','tramp','trawl','tread','treat','trend','trial','tribe','trick','tried','trill','troth','trout',
  'trove','truce','truck','truly','trump','truss','trust','truth','tumor','turbo','tutor','twang','tweak','twirl','udder',
  'ultra','umbra','uncut','under','unfit','until','upper','upset','usher','utter','vault','vaunt','verge','verse','vicar',
  'vigor','viral','virus','visit','vista','vital','vivid','vixen','vocal','vodka','voter','vowed','vulva','wager','waltz',
  'watch','water','weary','weave','wedge','weigh','weird','whale','whack','wheat','wheel','where','which','while','whiff',
  'whirl','whisk','whole','whose','wield','windy','witch','woman','women','world','wormy','worth','would','wound','wrack',
  'wrath','wreak','wreck','wrest','wring','write','wrote','wrong','yacht','yearn','yield','young','youth','zesty','zilch',
  'abide','abode','abort','abuse','abyss','adapt','adept','admit','adopt','adorn','adult','agate','agile','aglow','agree',
  'ahead','algae','align','alike','aloof','aloft','amass','amble','amend','amiss','ample','angel','ankle','annex','annoy',
  'antic','anvil','aorta','arbor','ardor','arena','argue','arise','aroma','arson','aside','assay','atlas','atone','attic',
  'audio','audit','augur','avail','avert','avoid','awake','award','aware','awful','bagel','balmy','banal','basic','basis',
  'batch','bathe','baton','bayou','beach','beard','beast','began','beige','belie','belle','bench','birch','black','blade',
  'blame','bland','blank','blare','blaze','bleak','bleed','blend','bless','blind','blink','bliss','block','blood','bloom',
  'blown','board','boast','bogus','bonus','booze','booth','boxer','brace','braid','brand','brave','bread','break','breed',
  'briar','brick','bride','brine','brisk','broad','brook','broth','brown','brunt','brush','bulge','bully','bunch','barge',
  'cabin','caddy','cameo','candy','cargo','carry','carve','catch','cause','cedar','chain','chair','chalk','chant','chase',
  'cheap','check','cheek','cheep','cheer','chess','chest','chief','child','chili','chill','chimp','china','choir','chord',
  'chore','chose','chunk','civic','civil','clang','clash','class','clean','clear','clerk','click','cling','clock','clone',
  'close','cloth','clout','coach','cobra','cocoa','comet','comic','comma','coral','could','count','couch','cover','covet',
  'crack','craft','cramp','crane','crash','craze','cream','crest','crime','crimp','crisp','croak','cross','crowd','crown',
  'cruel','crumb','crush','crust','curve','cycle','dairy','dance','datum','debut','decal','decay','decoy','delay','delta',
  'depot','detox','digit','dingo','dirty','ditty','diver','dizzy','dodge','dogma','dolly','doubt','dough','dowel','dowry',
  'draft','drape','drawl','dread','dream','dress','dried','drift','drill','drink','drive','drone','drove','drown','drupe',
  'duvet','dwarf','dwell','dying','eager','early','earth','ebony','eight','elect','ember','empty','enjoy','enter','entry',
  'envoy','equal','essay','ethos','evade','exact','exert','exile','exist','expel','extra','exude','fable','facet','fairy',
  'false','fancy','fangs','farce','fatal','feast','feral','ferry','fetch','fever','fiber','field','fiend','fifth','fifty',
  'finch','first','fixed','fizzy','flack','flame','flank','flare','flash','fleck','fleet','flesh','flair','floor','floss',
  'flour','flown','fluid','flume','flunk','flush','flute','folly','force','forge','forth','forum','found','frail','franc',
  'fraud','freak','fresh','friar','frond','frost','froth','frown','froze','fruit','fungi','funny','gavel','gauze','giddy',
  'giant','girth','given','gizmo','glare','glass','glaze','gleam','glean','glide','glint','gloom','gloss','glued','gnash',
  'golem','gorge','gourd','grace','grade','grail','grand','grant','grape','grasp','grass','grate','grave','graze','greed',
  'greet','grief','grime','grind','groan','groin','groom','grope','gross','group','grout','guard','guile','guise','gusto',
  'haste','haven','haunt','harsh','hatch','hazel','heady','heart','heavy','hedge','heist','hence','horde','hotel','house',
  'hover','human','humor','hutch','hyena','image','inbox','inept','infer','inner','input','intel','inter','intro','inure',
  'joust','karma','kebab','knave','known','label','lance','laser','latch','lathe','lemon','libel','liner','lingo','liver',
  'llama','lodge','logic','lorry','lotus','lower','lowly','loyal','lucid','lyric','macho','magic','major','maker','mambo',
  'mango','manor','march','marsh','medal','merge','metro','might','minor','mirth','model','money','motor','motto','moult',
  'mound','mourn','mouth','mover','muddy','multi','mummy','murky','music','muted','naive','niece','night','nippy','noble',
  'noisy','notch','novel','nurse','nutty','nymph','occur','ocean','offer','often','onset','optic','other','ought','outdo',
  'outer','ozone','paddy','pagan','panic','papal','paper','patch','pause','peach','penal','perch','petty','phone','photo',
  'piano','pinch','pixel','pizza','place','plain','plank','plant','plate','plaza','pluck','plume','plunk','poach','point',
  'poker','polyp','posit','pouch','pound','power','prank','prawn','price','pride','prime','print','prize','probe','prone',
  'prose','proud','prude','prune','psych','pygmy','queen','query','queue','quick','quiet','quota','quote','rabbi','radar',
  'radix','rally','ranch','rapid','ratio','raven','rayon','reach','ready','realm','rebel','reign','relax','renal','renew',
  'repay','repel','reply','reuse','rhino','ridge','ripen','rivet','robot','rouge','rough','round','route','rover','rower',
  'ruddy','rugby','ruler','sabot','sadly','salad','sally','salon','salsa','salty','salve','sauce','saucy','sauna','scald',
  'scale','scalp','scant','scare','scarf','scene','scone','scoop','scour','scout','scowl','scram','screw','scrub','seamy',
  'serve','setup','seven','shaft','shake','shall','shame','shape','share','sharp','shave','shawl','sheer','shelf','shell',
  'shift','shine','shirt','shock','shrub','shrug','shunt','sigma','silly','since','siren','sixty','skate','skiff','skimp',
  'skull','skunk','slack','slash','slave','sleek','sleep','sleet','slept','slice','slide','slope','sloth','slump','slunk',
  'slurp','smart','smash','smear','smell','smelt','smirk','smite','smoke','snack','snake','snaky','snare','sneak','sneer',
  'sniff',
  // 6-letter
  'market','master','matter','method','mirror','mobile','modern','moment','mostly','mother','motion','moving','muscle',
  'myself','narrow','native','nature','nearly','needed','nephew','normal','notice','number','object','obtain',
  'office','online','oppose','option','orange','origin','output','palace','parent','patent','patrol',
  'people','period','permit','person','phrase','pillar','player','please','pledge','plenty','pocket',
  'poison','policy','portal','potato','prefer','pretty','prison','profit','proper','public','purify','puzzle',
  'random','reason','record','reduce','reform','refuse','region','reject','remain','repair','result','return','reveal',
  'reward','ribbon','rising','robust','rocket','rubber','saddle','sample','screen','search','second','secret','select',
  'signal','silent','silver','simple','single','sister','sketch','slight','smooth','solar','source','speech',
  'spirit','spring','square','stable','statue','status','steady','strain','street','strict','strike','string','strong',
  'strung','struck','stupid','submit','summer','supply','surely','survey','switch','symbol','system','talent','target',
  'temple','tender','tested','thirst','though','threat','ticket','timber','tissue','tongue','toward','travel','treaty',
  'triple','trophy','tunnel','typing','uneven','unique','unless','update','uphold','urgent','useful','vacuum','vessel',
  'victim','vision','volume','wander','wealth','weapon','winter','wonder','worker','yellow',
  'abrupt','absorb','accent','access','accord','accuse','acquit','actual','affirm','afraid','agency','agenda','almost',
  'always','amount','appeal','appear','arcade','around','artery','assert','attain','author','avenue','baffle','ballot',
  'borrow','bounce','budget','burden','butter','cactus','campus','carbon','carpet','censor','center','cereal','charge',
  'cheery','choose','chrome','cinder','citrus','clover','cobalt','colony','combat','comedy','compel','comply','concur',
  'condor','confer','copper','corner','corona','covert','custom','damage','danger','daring','debris','defeat','defend',
  'define','demand','demise','derive','desert','devote','differ','dilute','dimple','direct','disarm','divide','donate',
  'double','driven','during','either','eleven','empire','endure','energy','engage','enough','equity','excite','expand',
  'expect','extent','factor','fallen','falter','famine','fatten','fester','feisty','fickle','filler','filter','finger',
  'fiscal','flange','flavor','fledge','flimsy','flinch','fluffy','follow','forage','formal','foster','fought','freely',
  'fright','frozen','fumble','future','gallon','gamble','gargle','gather','glitch','global','goblin','gossip','gotten',
  'gravel','grieve','grubby','guilty','gutter','hammer','hamper','handle','happen','harbor','harden','hardly','hearty',
  'helmet','herald','herbal','hiding','holder','honest','horrid','humble','hurdle','injury','insist','intact','intent',
  'invest','invite','jiggle','jostle','jovial','jumble','jungle','kettle','killer','launch','lavish','layout','leader',
  'lesson','lethal','linger','listen','litter','lively','living','loosen','lumber','luster','magnet','mainly','manage',
  'mangle','mantle','misery','mishap','mortal','muddle','muffle','mumble','muster','mystic','noodle','oppose','outlaw',
  'outlet','outrun','pander','pardon','parody','patron','ponder','potent','praise','preach','mutter','needle',
  'prince','prompt','pummel','racial','ramble','ransom','ravage','recent','reckon','rental','rescue','rotate','rubble',
  'rugged','savage','scheme','scorch','scream','sculpt','sector','senate','settle','severe','sizzle','sleuth','sliver',
  'soften','solemn','sorrow','sponge','sprout','squash','squeal','starve','sticky','strand','stroll','subdue','sunlit',
  'supper','tangle','timber','tinker','tirade','toilet','tongue','topple','touchy','tragic','triple','trophy','trusty',
  'turnip','twitch','tycoon','unfair','update','urgent','vacant','vanish','verbal','viable','virtue','wallow','wander',
  'warmth','weaken','weekly','whisky','wholly','wicked','wiggle','wither','wizard','wooden','worthy',
];

const WORD_SET = new Set(RAW.map(w => w.toLowerCase()));

/** Is this a valid dictionary word? */
export function isValidWord(word) {
  return WORD_SET.has(word.toLowerCase());
}

/**
 * Can `word` be formed from the given `letters` array?
 * Each letter can be used at most once.
 */
export function canFormWord(word, letters) {
  const pool = letters.map(l => l.toLowerCase());
  for (const ch of word.toLowerCase()) {
    const idx = pool.indexOf(ch);
    if (idx === -1) return false;
    pool.splice(idx, 1);
  }
  return true;
}

/** Returns all valid words (min 3 letters) formable from `letters` */
export function findAllWords(letters) {
  return RAW.filter(w => w.length >= 3 && canFormWord(w, letters));
}

/** Score a word: length-based points */
export function scoreWord(word) {
  const len = word.length;
  if (len <= 3) return 1;
  if (len === 4) return 2;
  if (len === 5) return 4;
  if (len === 6) return 6;
  return 10;
}

// Curated 6–7 letter seed words (guarantee a playable round)
const SEED_WORDS = [
  'STREAM','BRIDGE','PLANET','FRIEND','CASTLE','DRAGON','GARDEN','BRIGHT','WONDER',
  'SILVER','GOLDEN','MASTER','HUNTER','WINTER','SPRING','SUMMER','AUTUMN','FOREST',
  'BATTLE','KNIGHT','DESERT','ROCKET','CANDLE','JUNGLE','SIMPLE','GENTLE','PLENTY',
  'BROKEN','HONEST','LATEST','FROZEN','TENDER','MONKEY','MARBLE','PUDDLE','CIRCLE',
  'FLIGHT','ISLAND','TRAVEL','GRAVEL','CANVAS','WISDOM','FLOWER','CORNER','DINNER',
  'BOTTLE','BUTTON','HUNGER','SMOOTH','GROWTH','FABRIC','LIQUID','VIOLET','COTTON',
  'BANNER','RANSOM','CRADLE','BANTER','SAMPLE','LIVELY','STABLE','CREDIT','CARPET',
  'BRANCH','GLIDER','PLANET','SPONGE','TIMBER','WEALTH','BASKET','CANOPY','TEMPLE',
  'GARDEN','MIRROR','MUSCLE','ROCKET','ORANGE','BRIDGE','CASTLE','HUNTER','FOREST',
];

/**
 * Generate a new set of letters for a round.
 * Returns { letters: string[], seedWord: string, possibleWords: string[] }
 */
export function generateLetterSet() {
  const seedWord = SEED_WORDS[Math.floor(Math.random() * SEED_WORDS.length)];
  const letters  = seedWord.split('').sort(() => Math.random() - 0.5);
  const possible = findAllWords(letters);
  return { letters, seedWord, possibleWords: possible };
}

export default WORD_SET;
