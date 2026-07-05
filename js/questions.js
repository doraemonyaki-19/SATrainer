/*
 * SATrainer — Reading & Writing question bank.
 *
 * Loaded as a classic script (no build step, works from file://).
 * Exposes two globals:
 *   SAT_TAXONOMY  — the domain/skill structure the app tracks mastery on.
 *   SAT_QUESTIONS — the question bank, each tagged with a skill id + difficulty.
 *
 * Question shape:
 *   {
 *     id:         unique string
 *     skill:      skill id from SAT_TAXONOMY
 *     difficulty: 1 (easy) | 2 (medium) | 3 (hard)
 *     passage:    stimulus text (may be "" for pure grammar items)
 *     prompt:     the question stem
 *     choices:    [A, B, C, D]
 *     answer:     index of the correct choice (0-3)
 *     rationales: [why A, why B, why C, why D]  — shown as teaching feedback
 *   }
 */

// ---------------------------------------------------------------------------
// Taxonomy: the official Digital SAT Reading & Writing domains and skills.
// ---------------------------------------------------------------------------
const SAT_TAXONOMY = {
  domains: [
    {
      id: "info-ideas",
      name: "Information and Ideas",
      skills: [
        { id: "central-ideas", name: "Central Ideas and Details" },
        { id: "evidence-textual", name: "Command of Evidence (Textual)" },
        { id: "evidence-quant", name: "Command of Evidence (Quantitative)" },
        { id: "inferences", name: "Inferences" },
      ],
    },
    {
      id: "craft-structure",
      name: "Craft and Structure",
      skills: [
        { id: "words-in-context", name: "Words in Context" },
        { id: "text-structure", name: "Text Structure and Purpose" },
        { id: "cross-text", name: "Cross-Text Connections" },
      ],
    },
    {
      id: "expression",
      name: "Expression of Ideas",
      skills: [
        { id: "rhetorical-synthesis", name: "Rhetorical Synthesis" },
        { id: "transitions", name: "Transitions" },
      ],
    },
    {
      id: "conventions",
      name: "Standard English Conventions",
      skills: [
        { id: "boundaries", name: "Boundaries (Punctuation)" },
        { id: "form-structure", name: "Form, Structure, and Sense" },
      ],
    },
  ],
};

// Flat lookups built from the taxonomy (convenience for the rest of the app).
SAT_TAXONOMY.skillList = SAT_TAXONOMY.domains.flatMap((d) =>
  d.skills.map((s) => ({ ...s, domainId: d.id, domainName: d.name }))
);
SAT_TAXONOMY.skillById = Object.fromEntries(
  SAT_TAXONOMY.skillList.map((s) => [s.id, s])
);
SAT_TAXONOMY.domainById = Object.fromEntries(
  SAT_TAXONOMY.domains.map((d) => [d.id, d])
);

// ---------------------------------------------------------------------------
// Question bank
// ---------------------------------------------------------------------------
const SAT_QUESTIONS = [
  // ===== Central Ideas and Details =====
  {
    id: "ci-1",
    skill: "central-ideas",
    difficulty: 1,
    passage:
      "The axolotl, a salamander native to lakes near Mexico City, has a remarkable ability: it can regrow lost limbs, portions of its heart, and even parts of its brain. Unlike most amphibians, the axolotl also keeps its larval features—such as feathery external gills—for its entire life rather than losing them at maturity.",
    prompt: "Which choice best states the main idea of the text?",
    choices: [
      "The axolotl lives only in lakes near Mexico City.",
      "The axolotl is unusual because of its regenerative powers and its retention of larval features.",
      "Most amphibians lose their external gills as they mature.",
      "The axolotl can regrow parts of its brain but not its heart.",
    ],
    answer: 1,
    rationales: [
      "This is a detail from the text, not its main idea; the passage emphasizes what makes the axolotl remarkable, not just where it lives.",
      "Correct. The text's two points—regeneration and lifelong larval features—both support this as the central idea.",
      "True and stated, but it is a supporting contrast, not the overall point about the axolotl.",
      "Contradicts the text, which says the axolotl can regrow portions of its heart.",
    ],
  },
  {
    id: "ci-2",
    skill: "central-ideas",
    difficulty: 2,
    passage:
      "Historians once assumed that the Library of Alexandria was destroyed in a single catastrophic fire. Recent scholarship, however, suggests a slower decline: reduced funding under later rulers, the gradual departure of scholars, and repeated smaller episodes of damage over centuries steadily eroded the institution long before any single dramatic event.",
    prompt: "Which choice best states the main idea of the text?",
    choices: [
      "A single fire was responsible for the loss of the Library of Alexandria.",
      "The Library of Alexandria never held as many works as historians believed.",
      "The Library of Alexandria likely declined gradually rather than being destroyed all at once.",
      "Later rulers of Alexandria deliberately closed the library to save money.",
    ],
    answer: 2,
    rationales: [
      "This is the older view the text explicitly revises, not the main idea it advances.",
      "The passage never discusses the size of the collection.",
      "Correct. The text contrasts the old 'single fire' theory with evidence of a slow, multi-cause decline.",
      "The text mentions reduced funding but does not claim a deliberate closure.",
    ],
  },
  {
    id: "ci-3",
    skill: "central-ideas",
    difficulty: 3,
    passage:
      "In studying birdsong, researchers distinguish between innate and learned components. A young sparrow raised in isolation will still produce a rough, species-typical song, indicating a genetic template. Yet without hearing adult tutors during a critical early period, it never refines that song into the precise dialect of its region. The finished song thus reflects neither instinct nor experience alone.",
    prompt: "Which choice best states the main idea of the text?",
    choices: [
      "Sparrow song is entirely determined by the bird's genetic template.",
      "Sparrows raised in isolation cannot produce any song at all.",
      "A sparrow's mature song emerges from the interaction of an innate template and early learning.",
      "Regional dialects in birdsong are a recent discovery among researchers.",
    ],
    answer: 2,
    rationales: [
      "The text explicitly says the finished song is not the product of instinct alone.",
      "Contradicts the text: isolated sparrows produce a rough species-typical song.",
      "Correct. The closing sentence—'neither instinct nor experience alone'—captures the interaction of template and learning.",
      "The passage does not address when dialects were discovered.",
    ],
  },

  // ===== Command of Evidence (Textual) =====
  {
    id: "et-1",
    skill: "evidence-textual",
    difficulty: 2,
    passage:
      "A student claims that the invention of the mechanical clock changed how people structured their workdays, replacing task-based rhythms with fixed hours.",
    prompt:
      "Which finding, if true, would most directly support the student's claim?",
    choices: [
      "Mechanical clocks were expensive and initially owned mainly by wealthy institutions.",
      "After public clocks appeared in a town, records show laborers being paid by the hour rather than by the job completed.",
      "Early mechanical clocks were often inaccurate and needed frequent adjustment.",
      "Sundials and water clocks had been used to tell time for many centuries before.",
    ],
    answer: 1,
    rationales: [
      "This concerns ownership and cost, not whether workdays shifted to fixed hours.",
      "Correct. A shift from pay-by-job to pay-by-hour directly evidences task-based rhythms being replaced by fixed hours.",
      "Inaccuracy would, if anything, weaken confidence in clock-based scheduling.",
      "This addresses earlier timekeeping, not the claim about restructured workdays.",
    ],
  },
  {
    id: "et-2",
    skill: "evidence-textual",
    difficulty: 3,
    passage:
      "Ecologist Dr. Reyes hypothesizes that beavers improve drought resilience in a watershed: by building dams, they create ponds that store water and recharge groundwater, keeping streams flowing later into dry summers than they otherwise would.",
    prompt:
      "Which finding would most strongly support Dr. Reyes's hypothesis?",
    choices: [
      "Streams in watersheds with active beaver dams continued flowing an average of three weeks longer into summer than nearby dam-free streams.",
      "Beaver populations have expanded into new watersheds over the past decade.",
      "Beaver dams are constructed primarily from branches and mud gathered nearby.",
      "Some landowners consider beaver dams a nuisance because they flood low-lying fields.",
    ],
    answer: 0,
    rationales: [
      "Correct. Longer summer flow in dammed watersheds versus comparable dam-free ones directly supports improved drought resilience.",
      "Population growth says nothing about water storage or stream flow duration.",
      "Construction materials are irrelevant to the drought-resilience claim.",
      "This describes a drawback, not evidence about drought resilience.",
    ],
  },

  // ===== Command of Evidence (Quantitative) =====
  {
    id: "eq-1",
    skill: "evidence-quant",
    difficulty: 2,
    passage:
      "A researcher measured average daily screen time and reported hours of sleep for four groups of students:\n\n  Group W: 2 hrs screen, 8.5 hrs sleep\n  Group X: 4 hrs screen, 7.5 hrs sleep\n  Group Y: 6 hrs screen, 6.5 hrs sleep\n  Group Z: 8 hrs screen, 5.5 hrs sleep\n\nThe researcher argues that higher screen time is associated with less sleep.",
    prompt:
      "Which choice best uses data from the table to support the researcher's argument?",
    choices: [
      "Group W had more screen time and more sleep than Group Z.",
      "As screen time rises from Group W to Group Z, reported sleep steadily decreases from 8.5 to 5.5 hours.",
      "All four groups reported at least 5 hours of sleep.",
      "Group Y and Group Z reported the same amount of sleep.",
    ],
    answer: 1,
    rationales: [
      "Incorrect reading: Group W had less screen time (2 hrs) than Group Z (8 hrs).",
      "Correct. The steady inverse trend—more screen time, less sleep—directly supports the association claimed.",
      "True but irrelevant; a shared minimum does not show any association with screen time.",
      "False: Group Y reported 6.5 hours and Group Z 5.5 hours.",
    ],
  },
  {
    id: "eq-2",
    skill: "evidence-quant",
    difficulty: 3,
    passage:
      "A city compared recycling rates before and after adding curbside pickup:\n\n  Neighborhood A: 22% before, 41% after\n  Neighborhood B: 18% before, 20% after\n  Neighborhood C: 30% before, 55% after\n  Neighborhood D: 25% before, 26% after\n\nAn analyst concludes that curbside pickup raised recycling rates far more in some neighborhoods than others.",
    prompt: "Which choice best supports the analyst's conclusion?",
    choices: [
      "Every neighborhood had a higher recycling rate after curbside pickup than before.",
      "Neighborhoods A and C rose by 19 and 25 points, while B and D rose by only 2 and 1 points.",
      "Neighborhood C had the highest recycling rate both before and after.",
      "Neighborhood B started with the lowest recycling rate of the four.",
    ],
    answer: 1,
    rationales: [
      "This supports that rates rose overall, not that the increase varied widely between neighborhoods.",
      "Correct. Contrasting large gains (19, 25 points) with tiny ones (2, 1 points) directly shows the uneven effect.",
      "Highest absolute rate does not speak to how much the increase varied across neighborhoods.",
      "A low starting point alone does not demonstrate uneven change.",
    ],
  },

  // ===== Inferences =====
  {
    id: "in-1",
    skill: "inferences",
    difficulty: 2,
    passage:
      "Deep-sea anglerfish live where almost no sunlight reaches. Many species have evolved a bioluminescent lure that dangles in front of the mouth, glowing to attract smaller prey in the darkness. Species that live in shallower, dimly lit waters tend to have smaller, fainter lures.",
    prompt:
      "Which choice most logically completes the text?",
    choices: [
      "the brightness of an anglerfish's lure tends to correspond to how dark its environment is.",
      "anglerfish prefer to hunt during daylight hours.",
      "bioluminescent lures are found only in the deepest parts of the ocean.",
      "prey animals are attracted to anglerfish because of their large size.",
    ],
    answer: 0,
    rationales: [
      "Correct. Brighter lures in the darkest waters and fainter lures in dimmer-but-lit waters imply lure brightness tracks environmental darkness.",
      "Nothing in the text addresses time of day, and these fish live where sunlight barely reaches.",
      "The text says shallower species also have lures, just fainter ones—so lures are not only in the deepest waters.",
      "The text credits the glowing lure, not body size, for attracting prey.",
    ],
  },
  {
    id: "in-2",
    skill: "inferences",
    difficulty: 3,
    passage:
      "Archaeologists excavating a 3,000-year-old settlement found obsidian tools far from any volcanic source of the material. Chemical analysis matched the obsidian to a quarry over 500 kilometers away. No evidence of local obsidian working debris was found at the intermediate sites along the likely route.",
    prompt: "Which choice most logically completes the text?",
    choices: [
      "the settlement's residents likely mined obsidian from a nearby source.",
      "the finished or nearly finished tools were probably obtained through long-distance trade rather than made locally at each stop.",
      "obsidian tools were of little value to the settlement's residents.",
      "the intermediate sites were larger than the settlement itself.",
    ],
    answer: 1,
    rationales: [
      "There was no nearby source—the matched quarry was over 500 km away.",
      "Correct. A distant source plus no working debris at intermediate sites implies finished tools moved via trade, not local manufacture along the way.",
      "Transporting them 500 km suggests they were valued, not that they were worthless.",
      "The text gives no information comparing site sizes.",
    ],
  },

  // ===== Words in Context =====
  {
    id: "wc-1",
    skill: "words-in-context",
    difficulty: 1,
    passage:
      "Though the first draft of her novel was praised, the author remained ______ about it, insisting that entire chapters still needed to be rewritten before it could be published.",
    prompt:
      "Which choice completes the text with the most logical and precise word?",
    choices: ["critical", "enthusiastic", "indifferent", "confused"],
    answer: 0,
    rationales: [
      "Correct. Insisting chapters need rewriting shows she judged the draft harshly—she was critical of it.",
      "Enthusiasm contradicts her insistence that much still needed fixing.",
      "She was clearly not indifferent; she had strong views about revising it.",
      "'Confused' does not fit; she had a clear, decided opinion about the draft's flaws.",
    ],
  },
  {
    id: "wc-2",
    skill: "words-in-context",
    difficulty: 2,
    passage:
      "The committee's report was praised for its ______ tone: rather than taking sides, it laid out the competing arguments evenhandedly and left readers to draw their own conclusions.",
    prompt:
      "Which choice completes the text with the most logical and precise word?",
    choices: ["impartial", "hostile", "ambiguous", "reluctant"],
    answer: 0,
    rationales: [
      "Correct. Not taking sides and presenting arguments evenhandedly is the definition of an impartial tone.",
      "'Hostile' contradicts the evenhanded, neutral quality being praised.",
      "'Ambiguous' means unclear; the report was clear but neutral, which is different.",
      "'Reluctant' describes unwillingness, not neutrality between sides.",
    ],
  },
  {
    id: "wc-3",
    skill: "words-in-context",
    difficulty: 3,
    passage:
      "Far from being a rigid set of rules, the choreographer's style was notably ______: dancers were encouraged to reinterpret each piece, and no two performances unfolded in quite the same way.",
    prompt:
      "Which choice completes the text with the most logical and precise word?",
    choices: ["fluid", "meticulous", "archaic", "somber"],
    answer: 0,
    rationales: [
      "Correct. 'Far from rigid,' with reinterpretation and varying performances, points to a fluid, adaptable style.",
      "'Meticulous' suggests exacting precision, the opposite of the flexibility described.",
      "'Archaic' means old-fashioned, unrelated to the flexibility emphasized here.",
      "'Somber' describes mood, not the adaptability the sentence contrasts with rigidity.",
    ],
  },

  // ===== Text Structure and Purpose =====
  {
    id: "ts-1",
    skill: "text-structure",
    difficulty: 2,
    passage:
      "Many people assume that goldfish have a memory span of only a few seconds. In fact, studies have shown that goldfish can be trained to respond to signals for feeding and can remember such associations for months. This misconception likely persists because it offers a convenient, if inaccurate, explanation for the fish's repetitive behavior.",
    prompt: "Which choice best describes the overall structure of the text?",
    choices: [
      "It presents a common belief, corrects it with evidence, and then accounts for why the belief endures.",
      "It describes an experiment in detail and lists its limitations.",
      "It compares two competing scientific theories and endorses one.",
      "It traces the history of goldfish keeping from ancient to modern times.",
    ],
    answer: 0,
    rationales: [
      "Correct. The text states a common assumption, refutes it ('In fact...'), then explains why the myth persists.",
      "No experiment is described in detail, and no limitations are listed.",
      "There is one misconception and its correction, not two competing theories.",
      "The text gives no historical timeline of goldfish keeping.",
    ],
  },
  {
    id: "ts-2",
    skill: "text-structure",
    difficulty: 3,
    passage:
      "The following is adapted from a naturalist's essay. \"I had come to the marsh expecting silence. Instead, at dusk the air thickened with sound—the creak of frogs, the whir of insects, the sudden splash of something unseen. I realized then that my idea of 'wilderness' had been a picture, not a place: something viewed, never something entered.\"",
    prompt:
      "Which choice best describes the function of the last sentence in the text as a whole?",
    choices: [
      "It provides scientific classification of the marsh's inhabitants.",
      "It expresses the realization that reframes the narrator's earlier expectation.",
      "It introduces a new setting the narrator plans to visit next.",
      "It offers practical advice for other visitors to the marsh.",
    ],
    answer: 1,
    rationales: [
      "The sentence is reflective, not a classification of species.",
      "Correct. The final sentence articulates the insight that overturns the narrator's initial expectation of silence and a merely viewed 'wilderness.'",
      "No new setting is introduced; the narrator remains at the marsh.",
      "It offers a personal realization, not advice for visitors.",
    ],
  },

  // ===== Cross-Text Connections =====
  {
    id: "ct-1",
    skill: "cross-text",
    difficulty: 3,
    passage:
      "Text 1: Economist Alvarez argues that remote work boosts productivity, citing surveys in which employees report fewer distractions at home and more focused hours than in open-plan offices.\n\nText 2: Management researcher Boone contends that the gains from remote work are overstated. While individual focus may improve, Boone notes that spontaneous collaboration—the unplanned conversations that spark new ideas—declines sharply when teams rarely share a physical space.",
    prompt:
      "Based on the texts, how would Boone (Text 2) most likely respond to Alvarez's argument (Text 1)?",
    choices: [
      "By agreeing that remote work eliminates all forms of workplace distraction.",
      "By acknowledging the focus benefits Alvarez cites but arguing they come at the cost of collaboration.",
      "By denying that employees are more focused when working from home.",
      "By claiming that open-plan offices are more productive than any other arrangement.",
    ],
    answer: 1,
    rationales: [
      "Boone does not claim remote work eliminates all distraction; that overstates his point.",
      "Correct. Boone concedes individual focus 'may improve' (Alvarez's point) but warns it sacrifices spontaneous collaboration.",
      "Boone actually grants that focus may improve, so he would not simply deny it.",
      "Boone criticizes remote work's tradeoffs but never claims open-plan offices are the most productive setup.",
    ],
  },

  // ===== Rhetorical Synthesis =====
  {
    id: "rs-1",
    skill: "rhetorical-synthesis",
    difficulty: 2,
    passage:
      "While researching, a student has taken the following notes:\n\n• The kakapo is a flightless parrot native to New Zealand.\n• It is nocturnal and one of the world's longest-living birds.\n• By the 1990s, fewer than 50 kakapo remained.\n• A recovery program moved the birds to predator-free islands.\n• The population has since grown to over 200.",
    prompt:
      "The student wants to emphasize the success of the recovery program. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
    choices: [
      "The kakapo, a nocturnal parrot, is one of the world's longest-living birds.",
      "The kakapo is a flightless parrot native to New Zealand and is active at night.",
      "After a recovery program moved the kakapo to predator-free islands, its population grew from fewer than 50 in the 1990s to over 200.",
      "The kakapo is a flightless parrot that cannot escape predators by flying away.",
    ],
    answer: 2,
    rationales: [
      "This describes the bird's traits but says nothing about the recovery program's success.",
      "This gives background facts, not the program's outcome.",
      "Correct. It ties the recovery program to a concrete population rebound (under 50 → over 200), emphasizing its success.",
      "This explains the bird's vulnerability, not the program's success.",
    ],
  },
  {
    id: "rs-2",
    skill: "rhetorical-synthesis",
    difficulty: 3,
    passage:
      "While researching, a student has taken the following notes:\n\n• Lichens are organisms formed from a fungus and an alga (or cyanobacterium) living together.\n• The fungus provides structure and protection.\n• The alga produces food through photosynthesis.\n• Lichens can grow on bare rock where few other organisms survive.\n• Scientists use lichens to monitor air pollution because they absorb airborne substances.",
    prompt:
      "The student wants to explain to an audience unfamiliar with lichens what a lichen is. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
    choices: [
      "Scientists use lichens to monitor air pollution because lichens absorb airborne substances.",
      "A lichen is a partnership of a fungus and an alga: the fungus provides structure while the alga makes food through photosynthesis.",
      "Lichens can grow on bare rock where few other organisms survive.",
      "Lichens absorb airborne substances, which makes them useful to scientists.",
    ],
    answer: 1,
    rationales: [
      "This describes a use of lichens, not what a lichen fundamentally is.",
      "Correct. It defines a lichen by its two partners and each one's role—exactly what an unfamiliar audience needs.",
      "This is an interesting trait but does not explain what a lichen is.",
      "This states a use, not a definition.",
    ],
  },

  // ===== Transitions =====
  {
    id: "tr-1",
    skill: "transitions",
    difficulty: 1,
    passage:
      "The new bridge was designed to reduce traffic on the old highway. ______ commuters found that the toll made the bridge more expensive than their usual route, so many avoided it.",
    prompt:
      "Which choice completes the text with the most logical transition?",
    choices: ["However,", "Therefore,", "Similarly,", "For example,"],
    answer: 0,
    rationales: [
      "Correct. The bridge was meant to cut traffic, but commuters avoided it—a contrast that calls for 'However.'",
      "'Therefore' signals a result, but the second sentence contradicts the bridge's intended effect.",
      "'Similarly' signals likeness; the two sentences are in tension, not alike.",
      "'For example' introduces an illustration, but this is a contrasting outcome.",
    ],
  },
  {
    id: "tr-2",
    skill: "transitions",
    difficulty: 2,
    passage:
      "Solar panels lose efficiency at very high temperatures. ______ engineers in hot regions often leave a gap between the panels and the roof, allowing air to circulate and cool the equipment.",
    prompt:
      "Which choice completes the text with the most logical transition?",
    choices: ["Nevertheless,", "For this reason,", "In contrast,", "Meanwhile,"],
    answer: 1,
    rationales: [
      "'Nevertheless' signals contrast, but the second sentence is a consequence of the first.",
      "Correct. The heat problem causes the cooling design—'For this reason' expresses cause and effect.",
      "'In contrast' signals opposition; here the second idea follows from the first.",
      "'Meanwhile' marks simultaneous events, not the causal link present here.",
    ],
  },
  {
    id: "tr-3",
    skill: "transitions",
    difficulty: 3,
    passage:
      "The artist worked almost exclusively in charcoal for the first decade of her career. ______ her later work embraced vivid oil paints, filling entire galleries with color.",
    prompt:
      "Which choice completes the text with the most logical transition?",
    choices: ["Consequently,", "Likewise,", "By contrast,", "In addition,"],
    answer: 2,
    rationales: [
      "'Consequently' signals a result, but the shift to color is a contrast, not an outcome, of the charcoal period.",
      "'Likewise' signals similarity; charcoal and vivid oils are being contrasted.",
      "Correct. Muted charcoal versus vivid oils is a contrast, which 'By contrast' captures.",
      "'In addition' merely adds a similar item; the sentence marks a change in approach.",
    ],
  },

  // ===== Boundaries (Punctuation) =====
  {
    id: "bd-1",
    skill: "boundaries",
    difficulty: 1,
    passage:
      "The marathon route passed three landmarks ______ a historic lighthouse, a stone bridge, and the old harbor.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [": ", ", ", "; ", " "],
    answer: 0,
    rationales: [
      "Correct. A colon properly introduces the list that explains 'three landmarks.'",
      "A comma cannot introduce a list after a complete idea like this without creating a weak, unclear break.",
      "A semicolon joins two independent clauses; the list that follows is not an independent clause.",
      "Omitting punctuation runs the list into the sentence without the needed introduction.",
    ],
  },
  {
    id: "bd-2",
    skill: "boundaries",
    difficulty: 2,
    passage:
      "The telescope captured stunning images of distant galaxies ______ it also detected faint signals that puzzled astronomers for months.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [", and ", " and", ", ", "; and "],
    answer: 0,
    rationales: [
      "Correct. Two independent clauses joined by the coordinating conjunction 'and' require a comma before it.",
      "Without the comma before 'and,' the two independent clauses are run together.",
      "A comma alone between two independent clauses is a comma splice.",
      "A semicolon plus 'and' is redundant; use one or the other, not both.",
    ],
  },
  {
    id: "bd-3",
    skill: "boundaries",
    difficulty: 3,
    passage:
      "Marie Tharp, a geologist whose maps revealed the Mid-Atlantic Ridge ______ helped confirm the theory of plate tectonics, though her contributions were long overlooked.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [", ", ", and ", "; ", ": "],
    answer: 0,
    rationales: [
      "Correct. The clause 'whose maps revealed the Mid-Atlantic Ridge' is a nonrestrictive description set off by commas; a closing comma completes the pair before the main verb 'helped.'",
      "Adding 'and' creates a faulty second clause and leaves the subject 'Marie Tharp' without its verb.",
      "A semicolon would need an independent clause on each side; 'helped confirm...' is not independent here.",
      "A colon does not fit; what follows is the sentence's predicate, not a list or explanation.",
    ],
  },

  // ===== Form, Structure, and Sense =====
  {
    id: "fs-1",
    skill: "form-structure",
    difficulty: 1,
    passage:
      "Each of the volunteers who arrived early ______ given a specific station to manage during the event.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: ["was", "were", "have been", "are"],
    answer: 0,
    rationales: [
      "Correct. The subject is 'Each,' which is singular and takes the singular verb 'was.'",
      "'Were' is plural; the subject 'Each' is singular despite the nearby plural 'volunteers.'",
      "'Have been' is plural and also shifts the tense inappropriately.",
      "'Are' is plural and does not agree with the singular subject 'Each.'",
    ],
  },
  {
    id: "fs-2",
    skill: "form-structure",
    difficulty: 2,
    passage:
      "By the time the rescue team reached the summit, the stranded climbers ______ there for nearly two days.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: ["had waited", "wait", "will wait", "are waiting"],
    answer: 0,
    rationales: [
      "Correct. The waiting was completed before another past event (the team's arrival), which calls for the past perfect 'had waited.'",
      "'Wait' is present tense and cannot express action completed before a past moment.",
      "'Will wait' is future tense, inconsistent with the past-time frame.",
      "'Are waiting' is present progressive, clashing with 'By the time...reached.'",
    ],
  },
  {
    id: "fs-3",
    skill: "form-structure",
    difficulty: 3,
    passage:
      "Written in 1892 and largely ignored during the author's lifetime, ______ is now regarded as a landmark of early science fiction.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      "the novel",
      "the novel's reputation",
      "readers today believe the novel",
      "it was a time when the novel",
    ],
    answer: 0,
    rationales: [
      "Correct. The opening modifier describes the novel (written in 1892 and ignored), so 'the novel' must follow as the subject.",
      "A 'reputation' was not written in 1892; the modifier would dangle.",
      "This makes 'readers' the subject, but readers were not written in 1892—a misplaced modifier.",
      "'A time' was not written in 1892 either, leaving the modifier dangling.",
    ],
  },
  // =========================================================================
  // ADVANCED SET — higher-difficulty expansion across all skills.
  // =========================================================================

  // ===== Central Ideas and Details (advanced) =====
  {
    id: "ci-4",
    skill: "central-ideas",
    difficulty: 3,
    passage:
      "Translation theorist Lawrence Venuti has argued that the prevailing standard for judging literary translations—fluency, the sense that the text might have been written originally in the reader's language—is not a neutral virtue. A translation that reads 'naturally' erases both the labor of the translator and the foreignness of the source, offering readers the comforting illusion that no mediation has occurred. For Venuti, the very quality reviewers most often praise is the one that renders translation invisible as an art.",
    prompt: "Which choice best states the main idea of the text?",
    choices: [
      "Venuti contends that the fluency prized in translations conceals the translator's work and the text's foreign origins.",
      "Venuti believes that truly fluent translation is impossible to achieve in practice.",
      "Reviewers of translated literature should be required to read the original texts.",
      "Translations should be judged primarily by their accuracy rather than their style.",
    ],
    answer: 0,
    rationales: [
      "Correct. The text presents Venuti's claim that praised 'natural' fluency erases mediation—the translator's labor and the source's foreignness.",
      "The text says fluency is problematic, not that it is unattainable.",
      "The text critiques a standard of judgment; it proposes no requirement for reviewers.",
      "Accuracy versus style is never the contrast drawn; the issue is fluency's invisibility, not accuracy.",
    ],
  },
  {
    id: "ci-5",
    skill: "central-ideas",
    difficulty: 3,
    passage:
      "The following text is adapted from a 1913 novel. Etta had spent her girlhood promising herself she would leave the valley; now that the train ticket lay on the dresser, she found herself cataloguing the view from the kitchen window as though obliged to memorize it—the fence her father had set crooked, the birch she had climbed in defiance of her mother—each ordinary thing suddenly insisting on its own significance.",
    prompt: "Which choice best states the main idea of the text?",
    choices: [
      "Etta has decided at the last moment not to leave the valley after all.",
      "On the verge of a long-desired departure, Etta finds herself unexpectedly attentive to the familiar details of home.",
      "Etta resents her parents for keeping her in the valley through her girlhood.",
      "Etta worries that she will be unable to afford the train ticket.",
    ],
    answer: 1,
    rationales: [
      "The ticket lies ready on the dresser; nothing indicates she has abandoned the plan—only that leaving stirs unexpected feeling.",
      "Correct. The tension is between her lifelong wish to leave and the sudden significance ordinary home details take on as departure nears.",
      "The crooked fence and forbidden birch are recalled with attachment, not resentment; no grievance is expressed.",
      "The ticket is already purchased and money is never mentioned.",
    ],
  },
  {
    id: "ci-6",
    skill: "central-ideas",
    difficulty: 3,
    passage:
      "Studies linking the gut microbiome to mood disorders have proliferated over the past decade, and headlines routinely describe gut bacteria as controlling the brain. The underlying evidence is more modest: most human studies are correlational, unable to establish whether microbial differences cause mood changes, result from them, or reflect diet and medication. Experiments in germ-free mice do demonstrate causal pathways, but researchers caution that findings in such artificial animal models translate unevenly to humans.",
    prompt: "Which choice best states the main idea of the text?",
    choices: [
      "Gut bacteria have been proven to control human mood through pathways demonstrated in mice.",
      "Media coverage of scientific research is generally unreliable and should be disregarded by the public.",
      "Despite bold popular claims, the evidence tying the gut microbiome to mood remains largely correlational and hard to translate from animal models.",
      "Diet and medication are the true causes of mood disorders once attributed to gut bacteria.",
    ],
    answer: 2,
    rationales: [
      "Overstates the evidence; the text stresses that human studies are correlational and mouse findings translate unevenly.",
      "The text critiques specific overclaiming, not the reliability of all science coverage, and urges no such blanket dismissal.",
      "Correct. The passage contrasts sweeping headlines with modest, mostly correlational evidence and cautious animal-model results.",
      "Diet and medication are named as possible confounders, not established as the true causes.",
    ],
  },

  // ===== Command of Evidence (Textual, advanced) =====
  {
    id: "et-3",
    skill: "evidence-textual",
    difficulty: 3,
    passage:
      "A historian argues that the spread of coffeehouses in seventeenth-century England fostered a new culture of political debate: because coffeehouses admitted men of varied ranks for the price of a cup, they created spaces where social inferiors could question their betters.",
    prompt:
      "Which finding, if true, would most strongly support the historian's argument?",
    choices: [
      "Coffee was imported at considerable expense and remained more costly than domestically brewed ale.",
      "Surviving coffeehouse records show tradesmen and gentlemen seated at the same tables exchanging pointed criticism of royal policy.",
      "Several coffeehouses maintained subscriptions to competing political newsletters.",
      "The number of London coffeehouses grew rapidly between 1660 and 1690.",
    ],
    answer: 1,
    rationales: [
      "Relative cost of coffee says nothing about cross-rank political debate, the crux of the claim.",
      "Correct. Men of different ranks debating royal policy at the same tables is direct evidence of inferiors questioning their betters.",
      "Access to newsletters shows information supply, not the mixed-rank political exchange the argument specifies.",
      "Growth in number shows popularity, not that debate crossed social ranks.",
    ],
  },
  {
    id: "et-4",
    skill: "evidence-textual",
    difficulty: 3,
    passage:
      "A team proposes that a species of tropical tree relies on a single bird species to disperse its unusually large seeds: only that bird, they argue, can swallow and later deposit the seeds far from the parent tree, where seedlings are more likely to survive.",
    prompt:
      "Which finding, if true, would most seriously weaken the team's proposal?",
    choices: [
      "The bird species also feeds on the fruit of several other trees in the same forest.",
      "In areas where the bird has disappeared, the tree's seeds are still carried off and germinate at similar distances, dispersed by ground-dwelling rodents.",
      "The tree produces fewer seeds in years when the bird population is low.",
      "The bird can travel several kilometers in a single day.",
    ],
    answer: 1,
    rationales: [
      "That the bird eats other fruit does not bear on whether it is the sole disperser of this tree's seeds.",
      "Correct. If rodents disperse the seeds just as far where the bird is absent, the tree does not rely on that single bird species.",
      "A correlation with seed output does not challenge the claim about dispersal; it might even seem consistent with dependence.",
      "The bird's range would, if anything, support its effectiveness as a disperser, not undercut the claim.",
    ],
  },
  {
    id: "et-5",
    skill: "evidence-textual",
    difficulty: 3,
    passage:
      "In a novel, the narrator insists that her elderly neighbor Mr. Okonkwo is entirely indifferent to the children who cut through his yard. A reader, however, suspects the narrator has misread him.",
    prompt:
      "Which quotation from the text would most effectively support the reader's suspicion?",
    choices: [
      "\"He never once called out to them, never waved, never so much as turned his head.\"",
      "\"Each morning, before the children came, he quietly moved the rake and the sharp shears into the shed, out of the path they always took.\"",
      "\"The yard had gone to seed years ago, and he seemed to prefer it wild.\"",
      "\"He spent his afternoons indoors, the curtains drawn against the heat.\"",
    ],
    answer: 1,
    rationales: [
      "This reinforces the narrator's reading of indifference rather than complicating it.",
      "Correct. Quietly removing hazards from the children's path before they arrive reveals a hidden concern, contradicting supposed indifference.",
      "The state of the yard reflects his gardening habits, not his feelings about the children.",
      "Staying indoors with drawn curtains suggests withdrawal, consistent with indifference, not against it.",
    ],
  },

  // ===== Command of Evidence (Quantitative, advanced) =====
  {
    id: "eq-3",
    skill: "evidence-quant",
    difficulty: 3,
    passage:
      "A study measured the germination rate of seeds stored at four humidity levels for one year:\n\n  20% humidity: 88% germinated\n  40% humidity: 71% germinated\n  60% humidity: 52% germinated\n  80% humidity: 26% germinated\n\nThe researchers claim that storing seeds in drier conditions better preserves their viability.",
    prompt:
      "Which choice most effectively uses data from the study to support the researchers' claim?",
    choices: [
      "Seeds stored at 80% humidity still germinated at a rate of 26%.",
      "As storage humidity increased from 20% to 80%, germination fell steadily from 88% to 26%.",
      "Germination rates were measured after one full year of storage.",
      "Seeds stored at 40% humidity germinated more often than those at 60%.",
    ],
    answer: 1,
    rationales: [
      "A single mid-range figure does not establish the drier-is-better trend the claim asserts.",
      "Correct. The steady decline in germination as humidity rises directly supports that drier storage preserves viability.",
      "The storage duration is a study condition, not evidence about humidity's effect.",
      "True but partial; one pairwise comparison is weaker support than the full monotonic trend.",
    ],
  },
  {
    id: "eq-4",
    skill: "evidence-quant",
    difficulty: 3,
    passage:
      "A transit agency reported average weekday ridership (in thousands) for two lines before and after a fare change:\n\n  Line A: 120 before, 118 after\n  Line B: 64 before, 91 after\n\nLine A's fare was unchanged; Line B's fare was reduced by half. An analyst concludes that the fare reduction, not a general rise in transit use, drove Line B's ridership growth.",
    prompt:
      "Which choice best uses the data to support the analyst's conclusion?",
    choices: [
      "Line B carried fewer riders than Line A both before and after the change.",
      "Line B's ridership rose by about 42%, while Line A's, with no fare change, held essentially flat.",
      "Line A's ridership dropped slightly, from 120 to 118 thousand.",
      "Together the two lines carried more riders after the change than before.",
    ],
    answer: 1,
    rationales: [
      "Relative size of the lines does not isolate the fare change as the cause of growth.",
      "Correct. Line A serves as a control—flat with no fare change—so Line B's jump points to the fare cut rather than a general rise.",
      "Line A's tiny decline alone does not establish what caused Line B's increase.",
      "A combined total obscures the line-by-line contrast that supports the causal claim.",
    ],
  },
  {
    id: "eq-5",
    skill: "evidence-quant",
    difficulty: 3,
    passage:
      "Researchers compared two teaching methods, measuring the percentage of students reaching proficiency:\n\n  Method X — beginners: 40%, advanced: 82%\n  Method Y — beginners: 65%, advanced: 74%\n\nA reviewer argues that neither method is superior overall; rather, the better method depends on the students' starting level.",
    prompt:
      "Which choice most effectively uses data from the table to support the reviewer's argument?",
    choices: [
      "Method Y produced higher proficiency among beginners (65% vs. 40%), whereas Method X produced higher proficiency among advanced students (82% vs. 74%).",
      "Method X reached 82% proficiency among advanced students, the highest figure in the table.",
      "Both methods brought a majority of advanced students to proficiency.",
      "Method Y's results varied less between beginners and advanced students than Method X's did.",
    ],
    answer: 0,
    rationales: [
      "Correct. Each method wins at a different starting level, which is exactly the interaction the reviewer describes.",
      "A single top figure argues for Method X's superiority, the opposite of the reviewer's 'it depends' point.",
      "A shared success among advanced students does not show that the better method depends on starting level.",
      "Comparing the spread within each method does not establish which method is better for which learners.",
    ],
  },

  // ===== Inferences (advanced) =====
  {
    id: "in-3",
    skill: "inferences",
    difficulty: 3,
    passage:
      "Economists distinguish between a currency's value and public confidence in it. In several historical episodes, governments that printed money to cover debts found that prices rose faster than the quantity of money itself: once people expected further printing, they rushed to spend before their cash lost value, and this very haste accelerated the rise in prices.",
    prompt: "Which choice most logically completes the text?",
    choices: [
      "the amount of money in circulation is the only factor that determines a currency's prices.",
      "expectations about future policy can influence prices independently of the current money supply.",
      "governments can always halt inflation simply by ceasing to print money.",
      "rising prices tend to make people save more of their money.",
    ],
    answer: 1,
    rationales: [
      "The text's whole point is that prices rose faster than the money supply, so quantity alone is not decisive.",
      "Correct. Prices outran the money supply because of what people expected—an independent effect of expectations.",
      "The passage suggests expectations, once formed, drive spending; it does not claim halting printing is always sufficient.",
      "The episode shows haste to spend, not increased saving, as prices rose.",
    ],
  },
  {
    id: "in-4",
    skill: "inferences",
    difficulty: 3,
    passage:
      "A paleontologist notes that the fossilized footprints of a large theropod dinosaur are spaced far apart and show only the front portions of the feet contacting the ground. In living animals, such stride length and toe-only prints are characteristic of fast running rather than walking.",
    prompt: "Which choice most logically completes the text?",
    choices: [
      "the theropod was probably moving quickly when it made the footprints.",
      "the theropod was unable to walk and could only run.",
      "the footprints were made by more than one animal traveling together.",
      "theropods were generally slower than other dinosaurs of their size.",
    ],
    answer: 0,
    rationales: [
      "Correct. Long strides and toe-only prints match fast running in living animals, so the trackmaker was likely moving quickly.",
      "That these prints record running does not imply the animal was incapable of walking.",
      "Nothing indicates multiple animals; the trackway describes one set of prints.",
      "The text addresses this animal's gait in one instance, not the relative speed of theropods generally.",
    ],
  },
  {
    id: "in-5",
    skill: "inferences",
    difficulty: 3,
    passage:
      "In a study of memory, participants recalled more items from a list when they were tested in the same room where they had learned them than in a different room. The effect vanished, however, when participants were asked to vividly imagine the original room before being tested elsewhere.",
    prompt: "Which choice most logically completes the text?",
    choices: [
      "physical location is the only cue that can aid memory retrieval.",
      "the memory benefit seems to depend on mentally reinstating the learning context rather than on physically returning to it.",
      "vivid imagination generally impairs a person's ability to recall lists.",
      "participants recalled the most items when tested in an unfamiliar room.",
    ],
    answer: 1,
    rationales: [
      "Imagining the room restored the benefit without physical return, so location is not the only possible cue.",
      "Correct. Because imagining the room reproduced the advantage, the mental reinstatement of context—not the physical place—appears to matter.",
      "Imagination restored recall here; it did not impair it.",
      "Recall was best in the same room or when it was imagined, not in an unfamiliar room.",
    ],
  },
  {
    id: "in-6",
    skill: "inferences",
    difficulty: 3,
    passage:
      "A linguist observes that in a certain language, speakers reliably use one set of verb endings for events they witnessed personally and a different set for events they learned about secondhand. Crucially, using the firsthand endings for an event one did not witness is judged not merely impolite but grammatically incorrect.",
    prompt: "Which choice most logically completes the text?",
    choices: [
      "in this language, indicating the source of one's information is a required grammatical feature, not an optional stylistic choice.",
      "speakers of this language are more honest than speakers of other languages.",
      "this language lacks any way to describe events that were witnessed directly.",
      "secondhand information is considered more reliable than firsthand information in this language.",
    ],
    answer: 0,
    rationales: [
      "Correct. If misusing the endings is grammatically incorrect, marking one's information source is obligatory grammar, not optional style.",
      "The grammar concerns marking evidence source, which says nothing about speakers' relative honesty.",
      "The firsthand endings exist precisely to describe directly witnessed events.",
      "Distinct endings mark the source; the text asserts no ranking of reliability between them.",
    ],
  },

  // ===== Words in Context (advanced) =====
  {
    id: "wc-4",
    skill: "words-in-context",
    difficulty: 3,
    passage:
      "The senator's supposed apology was so hedged with conditions and qualifications that critics dismissed it as merely ______: an expression that had the form of contrition without its substance.",
    prompt:
      "Which choice completes the text with the most logical and precise word?",
    choices: ["perfunctory", "candid", "vehement", "meticulous"],
    answer: 0,
    rationales: [
      "Correct. An apology with the form of contrition but not its substance is perfunctory—done for show, without sincerity.",
      "'Candid' means frank and sincere, the opposite of the hollow gesture described.",
      "'Vehement' means forceful; the apology was hedged and weak, not forceful.",
      "'Meticulous' means careful and precise, which does not capture the emptiness the critics allege.",
    ],
  },
  {
    id: "wc-5",
    skill: "words-in-context",
    difficulty: 3,
    passage:
      "Early reviewers found the composer's late works forbiddingly austere, but modern listeners tend to hear in that same spareness something ______: a deliberate stripping-away that concentrates rather than diminishes emotional force.",
    prompt:
      "Which choice completes the text with the most logical and precise word?",
    choices: ["bombastic", "distracting", "purposeful", "derivative"],
    answer: 2,
    rationales: [
      "'Bombastic' means inflated and showy, contradicting the described spareness.",
      "'Distracting' clashes with the idea that the stripping-away concentrates emotional force.",
      "Correct. 'A deliberate stripping-away' signals intention, so the spareness is heard as purposeful.",
      "'Derivative' means unoriginal, which the passage's praise of concentrated force does not support.",
    ],
  },
  {
    id: "wc-6",
    skill: "words-in-context",
    difficulty: 3,
    passage:
      "The field guide warns that the plant's medicinal reputation rests on ______ evidence: a handful of anecdotes and no controlled study, hardly enough to justify the confident claims on the packaging.",
    prompt:
      "Which choice completes the text with the most logical and precise word?",
    choices: ["definitive", "tenuous", "abundant", "impartial"],
    answer: 1,
    rationales: [
      "'Definitive' means conclusive, contradicting 'a handful of anecdotes and no controlled study.'",
      "Correct. Anecdotes with no controlled study make the evidentiary basis tenuous—thin and weak.",
      "'Abundant' contradicts the described scarcity of evidence.",
      "'Impartial' concerns bias, not the quantity or strength of the evidence at issue.",
    ],
  },
  {
    id: "wc-7",
    skill: "words-in-context",
    difficulty: 3,
    passage:
      "Unlike her rivals, who staked out fixed positions and defended them at all costs, the diplomat was prized for her ______: she adjusted her approach as talks evolved, never mistaking consistency for strength.",
    prompt:
      "Which choice completes the text with the most logical and precise word?",
    choices: ["obstinacy", "adaptability", "reticence", "extravagance"],
    answer: 1,
    rationales: [
      "'Obstinacy' describes the rivals' fixed stance, the very quality she is contrasted with.",
      "Correct. Adjusting her approach as talks evolved is adaptability—exactly what sets her apart from the rigid rivals.",
      "'Reticence' means reserve in speaking, unrelated to the flexibility being praised.",
      "'Extravagance' means excess or lavishness, which the passage does not describe.",
    ],
  },

  // ===== Text Structure and Purpose (advanced) =====
  {
    id: "ts-3",
    skill: "text-structure",
    difficulty: 3,
    passage:
      "It is often said that necessity is the mother of invention. The history of the vacuum flask suggests the reverse can also hold. James Dewar devised his double-walled, silvered vessel in 1892 not to keep coffee hot but to store liquefied gases in the laboratory. Only later did others recognize that the same principle could serve an everyday need no one had framed as urgent—and the thermos was born.",
    prompt: "Which choice best describes the overall structure of the text?",
    choices: [
      "It states a familiar maxim, then uses a historical case to complicate it.",
      "It defines a scientific term and lists its industrial applications.",
      "It presents two inventors and argues that one deserves more credit.",
      "It describes a laboratory procedure in chronological detail.",
    ],
    answer: 0,
    rationales: [
      "Correct. The text opens with the 'necessity is the mother of invention' maxim, then the vacuum flask case shows invention preceding recognized need.",
      "No term is formally defined and no list of industrial applications is given.",
      "Only Dewar is named; there is no dispute over credit between inventors.",
      "The text sketches a history of use, not a step-by-step laboratory procedure.",
    ],
  },
  {
    id: "ts-4",
    skill: "text-structure",
    difficulty: 3,
    passage:
      "The following is adapted from an essay on cities. \"We praise the grand avenue and the soaring tower, and forget the alley. Yet it is in the alley—the service lane, the shortcut, the place too narrow for ceremony—that a city conducts its real business: deliveries at dawn, quiet conversations, the accumulation of a thousand unremarkable acts. The monument tells us what a city wishes to be; the alley tells us what it is.\"",
    prompt:
      "Which choice best describes the function of the last sentence in the text as a whole?",
    choices: [
      "It concedes that monuments are ultimately more important than alleys.",
      "It crystallizes the essay's contrast by assigning distinct revealing roles to monument and alley.",
      "It introduces a new example that the rest of the passage will develop.",
      "It qualifies the earlier praise of grand avenues with a technical exception.",
    ],
    answer: 1,
    rationales: [
      "The sentence elevates the alley as what a city 'is,' rather than conceding the monument's greater importance.",
      "Correct. The closing antithesis (monument = wish, alley = reality) sharpens the whole essay's contrast between the celebrated and the overlooked.",
      "It caps the argument rather than introducing a new example to be developed.",
      "It draws a thematic contrast, not a narrow technical exception to earlier praise.",
    ],
  },
  {
    id: "ts-5",
    skill: "text-structure",
    difficulty: 3,
    passage:
      "Conventional accounts credit the printing press with rapidly standardizing spelling across Europe. The reality was messier. For decades, early printers set type by ear and by the width of the line, freely varying spellings to justify their margins; a single page might spell one word three ways. Standardization came only gradually, as later printers and lexicographers imposed norms the press itself had not required.",
    prompt: "Which choice best describes the overall structure of the text?",
    choices: [
      "It challenges a common account, offers contrary evidence, and specifies what actually produced the outcome.",
      "It traces the invention of the printing press from prototype to finished machine.",
      "It compares spelling conventions in two different European languages.",
      "It argues that spelling should never have been standardized at all.",
    ],
    answer: 0,
    rationales: [
      "Correct. The text disputes the 'press standardized spelling' account, gives evidence of variable early spelling, then credits later printers and lexicographers.",
      "No account of the machine's invention or prototypes appears.",
      "The passage does not compare two languages' conventions.",
      "It explains how standardization actually came about; it makes no case against standardizing.",
    ],
  },

  // ===== Cross-Text Connections (advanced) =====
  {
    id: "ct-2",
    skill: "cross-text",
    difficulty: 3,
    passage:
      "Text 1: Critic Danvers praises the museum's decision to display its artifacts with minimal labeling. Stripped of lengthy placards, she writes, each object confronts the viewer directly, inviting a personal, unmediated encounter with the past.\n\nText 2: Curator Ilori acknowledges the appeal of spare presentation but warns of its cost. Without context—who made an object, for whom, and why—visitors, she argues, tend to fall back on their own assumptions, mistaking a ceremonial tool for a mere decoration and missing the meaning the object held for the people who made it.",
    prompt:
      "Based on the texts, how would Ilori (Text 2) most likely respond to the view Danvers expresses in Text 1?",
    choices: [
      "By agreeing that minimal labeling is the ideal way to display all artifacts.",
      "By arguing that the 'unmediated' encounter Danvers prizes often leaves viewers to misread objects they lack the context to understand.",
      "By insisting that artifacts should never be displayed to the public at all.",
      "By claiming that lengthy placards are the only thing museum visitors actually read.",
    ],
    answer: 1,
    rationales: [
      "Ilori warns against the costs of spare labeling, so she would not endorse it as ideal for all artifacts.",
      "Correct. Ilori holds that without context viewers fall back on assumptions and misread objects—directly countering Danvers's prized 'unmediated encounter.'",
      "Ilori discusses how to present artifacts, never arguing against displaying them.",
      "Ilori stresses the value of context, but she makes no claim about what visitors do or do not read.",
    ],
  },
  {
    id: "ct-3",
    skill: "cross-text",
    difficulty: 3,
    passage:
      "Text 1: Researcher Kwan reports that urban parks measurably lower nearby residents' stress, citing reduced cortisol levels among people who take daily walks in green spaces.\n\nText 2: Researcher Bello does not dispute Kwan's measurements but questions the inference. People who already feel less stressed, Bello notes, may simply be more inclined to take daily walks in the first place—so the walks might reflect low stress rather than cause it.",
    prompt: "Based on the texts, Bello would most likely characterize Kwan's conclusion as",
    choices: [
      "well supported, since the cortisol measurements are accurate.",
      "premature, because the data may confuse a cause with an effect.",
      "irrelevant, since urban parks have no measurable health benefits.",
      "obvious, because everyone already knows that walking reduces stress.",
    ],
    answer: 1,
    rationales: [
      "Bello accepts the measurements but challenges the causal inference drawn from them, so he would not call the conclusion well supported.",
      "Correct. Bello raises reverse causation—low stress may prompt the walks—so he'd deem Kwan's causal conclusion premature.",
      "Bello does not dispute the measurements or deny benefits; he questions the direction of causation.",
      "Bello treats the causal claim as unsettled, not as obvious common knowledge.",
    ],
  },
  {
    id: "ct-4",
    skill: "cross-text",
    difficulty: 3,
    passage:
      "Text 1: In an essay on creativity, Adler contends that strict formal constraints—a sonnet's fourteen lines, a fugue's rules—spur invention by forcing artists to find unexpected solutions within tight limits.\n\nText 2: Ferro, a songwriter, describes abandoning traditional song structures to compose freely, without predetermined forms. Only by refusing inherited templates, Ferro says, could the music follow the feeling wherever it led.",
    prompt:
      "Based on the texts, Adler and Ferro would most likely disagree about which statement?",
    choices: [
      "Creativity is a quality worth cultivating in artists.",
      "Formal constraints tend to stimulate rather than hinder artistic invention.",
      "Music and poetry are both legitimate art forms.",
      "Artists benefit from practicing their craft regularly.",
    ],
    answer: 1,
    rationales: [
      "Both value creativity; that is common ground, not a point of disagreement.",
      "Correct. Adler credits constraints with spurring invention, while Ferro credits abandoning fixed forms—so they would clash on this claim.",
      "Neither questions the legitimacy of music or poetry as art forms.",
      "Neither text addresses regular practice, so it is not a stated disagreement.",
    ],
  },
  {
    id: "ct-5",
    skill: "cross-text",
    difficulty: 3,
    passage:
      "Text 1: Astronomer Petrova argues that searching for life on other planets should prioritize worlds with atmospheres rich in oxygen, since on Earth oxygen is produced overwhelmingly by living organisms.\n\nText 2: Astronomer Ndiaye cautions that recent models show certain lifeless planets can accumulate oxygen through purely chemical processes, such as the breakdown of water vapor by starlight. Oxygen, he concludes, is a suggestive but unreliable signature on its own.",
    prompt:
      "Based on the texts, how would Ndiaye (Text 2) most likely respond to Petrova's recommendation in Text 1?",
    choices: [
      "By agreeing that oxygen-rich atmospheres guarantee the presence of life.",
      "By cautioning that oxygen can arise without life, so its presence alone should not be treated as decisive evidence.",
      "By arguing that the search for extraterrestrial life should be abandoned entirely.",
      "By claiming that oxygen is never produced by living organisms.",
    ],
    answer: 1,
    rationales: [
      "Ndiaye's whole point is that oxygen can form without life, so he would reject any guarantee.",
      "Correct. Ndiaye notes lifeless chemical routes to oxygen and calls it unreliable alone—tempering Petrova's emphasis on oxygen.",
      "Ndiaye refines how to interpret a signature; he does not call for abandoning the search.",
      "Ndiaye does not deny that organisms produce oxygen; he adds that nonliving processes can too.",
    ],
  },

  // ===== Rhetorical Synthesis (advanced) =====
  {
    id: "rs-3",
    skill: "rhetorical-synthesis",
    difficulty: 3,
    passage:
      "While researching, a student has taken the following notes:\n\n• The Antikythera mechanism is an ancient Greek device recovered from a shipwreck.\n• It dates to roughly the second century BCE.\n• It used dozens of bronze gears to model the motions of the sun, moon, and planets.\n• No comparably complex geared device is known for over a thousand years afterward.\n• Some scholars call it the first known analog computer.",
    prompt:
      "The student wants to emphasize how technologically advanced the Antikythera mechanism was for its time. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
    choices: [
      "The Antikythera mechanism, an ancient Greek device, was recovered from a shipwreck.",
      "Built around the second century BCE, the Antikythera mechanism used dozens of bronze gears to model celestial motions—a complexity unmatched for over a thousand years afterward.",
      "The Antikythera mechanism dates to roughly the second century BCE.",
      "Some scholars refer to the Antikythera mechanism as an analog device.",
    ],
    answer: 1,
    rationales: [
      "Where it was found says nothing about how advanced it was for its era.",
      "Correct. Pairing its geared modeling of the heavens with the thousand-year gap in comparable devices underscores how advanced it was.",
      "A bare date does not convey technological sophistication.",
      "Calling it an analog device omits the complexity and the long gap that show its advancement.",
    ],
  },
  {
    id: "rs-4",
    skill: "rhetorical-synthesis",
    difficulty: 3,
    passage:
      "While researching, a student has taken the following notes:\n\n• Bioluminescence is the production of light by living organisms.\n• It occurs in fireflies, certain fungi, and many deep-sea creatures.\n• It results from a chemical reaction involving a molecule called luciferin.\n• The reaction produces light with almost no heat.\n• Scientists have adapted luciferin-based reactions as markers in medical research.",
    prompt:
      "The student wants to explain to an audience unfamiliar with bioluminescence what causes it. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
    choices: [
      "Bioluminescence occurs in fireflies, certain fungi, and many deep-sea creatures.",
      "Scientists have adapted luciferin-based reactions as markers in medical research.",
      "Bioluminescence is light produced by living organisms through a chemical reaction involving a molecule called luciferin.",
      "The light produced by bioluminescence is generated with almost no heat.",
    ],
    answer: 2,
    rationales: [
      "This lists where it occurs, not what causes it.",
      "This describes a use of the reaction, not the cause of bioluminescence.",
      "Correct. It states both what bioluminescence is and its cause—the luciferin chemical reaction—for an unfamiliar audience.",
      "The near-absence of heat is a trait of the light, not an explanation of what causes it.",
    ],
  },
  {
    id: "rs-5",
    skill: "rhetorical-synthesis",
    difficulty: 3,
    passage:
      "While researching, a student has taken the following notes:\n\n• Ada Lovelace worked with Charles Babbage on his proposed Analytical Engine in the 1840s.\n• She wrote an algorithm intended to be carried out by the machine.\n• She speculated that such a machine could one day manipulate symbols, not just numbers—for instance, composing music.\n• The Analytical Engine was never built in her lifetime.\n• Many historians regard her notes as anticipating key ideas of modern computing.",
    prompt:
      "The student wants to highlight the visionary nature of Lovelace's ideas. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
    choices: [
      "Ada Lovelace worked with Charles Babbage on the Analytical Engine in the 1840s.",
      "Though the Analytical Engine was never built in her lifetime, Lovelace foresaw that such a machine might one day manipulate symbols to do things like compose music—an idea historians see as anticipating modern computing.",
      "The Analytical Engine was never built during Ada Lovelace's lifetime.",
      "Ada Lovelace wrote an algorithm intended to be carried out by a machine.",
    ],
    answer: 1,
    rationales: [
      "The collaboration date alone does not convey the forward-looking nature of her ideas.",
      "Correct. Her speculation that a machine could manipulate symbols, tied to historians' view that she anticipated modern computing, showcases her vision.",
      "That the machine went unbuilt does not, by itself, highlight her foresight.",
      "Writing an algorithm is notable but understates the visionary leap the goal calls for.",
    ],
  },

  // ===== Transitions (advanced) =====
  {
    id: "tr-4",
    skill: "transitions",
    difficulty: 3,
    passage:
      "Most economists predicted that the new tariff would raise consumer prices sharply within months. ______ prices barely moved, as importers absorbed the added costs to avoid losing market share.",
    prompt:
      "Which choice completes the text with the most logical transition?",
    choices: ["Accordingly,", "In the event,", "Furthermore,", "As a result,"],
    answer: 1,
    rationales: [
      "'Accordingly' signals that what follows fits the prediction, but prices did the opposite.",
      "Correct. 'In the event' introduces what actually happened, fittingly contrasting the prediction with the flat prices.",
      "'Furthermore' adds a similar point; here the outcome contradicts the forecast.",
      "'As a result' marks a consequence of the prediction, but the flat prices ran counter to it.",
    ],
  },
  {
    id: "tr-5",
    skill: "transitions",
    difficulty: 3,
    passage:
      "The committee gathered extensive public feedback before drafting the ordinance. The final text, ______ reflected almost none of the concerns residents had raised, prompting accusations that the hearings had been a formality.",
    prompt:
      "Which choice completes the text with the most logical transition?",
    choices: ["therefore,", "however,", "likewise,", "in addition,"],
    answer: 1,
    rationales: [
      "'Therefore' signals a result consistent with gathering feedback, but the text ignored that feedback.",
      "Correct. Gathering feedback yet reflecting almost none of it is a contrast, which 'however' marks.",
      "'Likewise' signals similarity, but the outcome opposes the feedback-gathering effort.",
      "'In addition' merely adds a like point; the sentence turns on a contradiction.",
    ],
  },
  {
    id: "tr-6",
    skill: "transitions",
    difficulty: 3,
    passage:
      "The vaccine must be kept within a narrow temperature range to remain effective. Clinics in remote areas often lack reliable refrigeration; ______ distributing the vaccine to such regions has required engineers to design special cooling containers that function for days without electricity.",
    prompt:
      "Which choice completes the text with the most logical transition?",
    choices: ["nonetheless,", "consequently,", "by comparison,", "for instance,"],
    answer: 1,
    rationales: [
      "'Nonetheless' signals contrast, but the container design follows from the lack of refrigeration.",
      "Correct. The refrigeration problem causes the need for special containers—'consequently' expresses that cause and effect.",
      "'By comparison' sets up a contrast between two things, which the sentence does not do.",
      "'For instance' introduces an example, but the container design is a consequence, not an illustration, of the problem.",
    ],
  },

  // ===== Boundaries (advanced) =====
  {
    id: "bd-4",
    skill: "boundaries",
    difficulty: 3,
    passage:
      "The expedition faced a difficult choice ______ they could wait out the storm and risk running low on supplies, or press on and risk the treacherous pass.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [": ", ", ", " ", " and "],
    answer: 0,
    rationales: [
      "Correct. A colon after the independent clause properly introduces the elaboration of the 'difficult choice.'",
      "A comma cannot join this independent clause to the full explanation that follows without creating a comma splice.",
      "Omitting punctuation fuses two independent clauses into a run-on.",
      "Adding 'and' still leaves two independent clauses spliced without proper punctuation.",
    ],
  },
  {
    id: "bd-5",
    skill: "boundaries",
    difficulty: 3,
    passage:
      "The scientist who first described the phenomenon ______ Rosalind Franklin ______ received little public credit during her lifetime.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      ", ... , ",
      "—that is, ... —",
      ", ... —",
      " ... ,",
    ],
    answer: 0,
    rationales: [
      "Correct. 'Rosalind Franklin' is a nonrestrictive appositive renaming 'the scientist,' so it takes a matched pair of commas.",
      "'That is' improperly changes the meaning and mixes an em dash with the appositive.",
      "Punctuation must match: a comma cannot open the appositive and an em dash close it.",
      "Omitting the opening comma leaves the appositive without its needed enclosing pair.",
    ],
  },
  {
    id: "bd-6",
    skill: "boundaries",
    difficulty: 3,
    passage:
      "Having reviewed the data for weeks ______ the panel concluded that the original hypothesis could not account for the anomaly.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [", ", "; ", ": ", " and "],
    answer: 0,
    rationales: [
      "Correct. The introductory participial phrase 'Having reviewed the data for weeks' is set off from the main clause by a comma.",
      "A semicolon requires an independent clause before it, but the opening phrase is not independent.",
      "A colon needs a complete independent clause before it; the introductory phrase does not qualify.",
      "Adding 'and' creates a faulty structure, leaving no proper main clause after the introductory phrase.",
    ],
  },
  {
    id: "bd-7",
    skill: "boundaries",
    difficulty: 3,
    passage:
      "The novelist published three acclaimed books in a single decade ______ afterward, she fell silent for nearly thirty years, refusing every request for a new manuscript.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: ["; ", ", ", " ", ": and "],
    answer: 0,
    rationales: [
      "Correct. Two closely related independent clauses may be joined by a semicolon, which fits here without a conjunction.",
      "A comma alone between two independent clauses produces a comma splice.",
      "With no punctuation, the two independent clauses run together.",
      "A colon plus 'and' is ungrammatical; neither element belongs in this position.",
    ],
  },

  // ===== Form, Structure, and Sense (advanced) =====
  {
    id: "fs-4",
    skill: "form-structure",
    difficulty: 3,
    passage:
      "The board recommended that each new hire ______ a mentor during the first month, a policy intended to ease the transition into the company.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: ["be assigned", "is assigned", "was assigned", "has been assigned"],
    answer: 0,
    rationales: [
      "Correct. After 'recommended that,' English uses the subjunctive base form: 'that each new hire be assigned.'",
      "'Is assigned' is indicative, not the subjunctive required after 'recommended that.'",
      "'Was assigned' is past indicative and does not fit the subjunctive recommendation.",
      "'Has been assigned' is present perfect indicative, again not the required subjunctive.",
    ],
  },
  {
    id: "fs-5",
    skill: "form-structure",
    difficulty: 3,
    passage:
      "The new turbine is prized not only for its efficiency but also for ______: it runs quietly even at full output.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      "how quiet it operates",
      "its quietness",
      "operating quietly",
      "being quiet in operation",
    ],
    answer: 1,
    rationales: [
      "'How quiet it operates' is ungrammatical and breaks the parallel with the noun 'its efficiency.'",
      "Correct. 'Not only for its efficiency but also for its quietness' keeps parallel noun phrases after each 'for.'",
      "The gerund 'operating' is not parallel with the noun 'efficiency' following the paired 'for.'",
      "'Being quiet in operation' is a wordy gerund phrase that breaks the noun-phrase parallelism.",
    ],
  },
  {
    id: "fs-6",
    skill: "form-structure",
    difficulty: 3,
    passage:
      "Neither the museum's director nor its trustees ______ willing to comment on the disputed acquisition, leaving reporters to speculate.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: ["were", "was", "has been", "is"],
    answer: 0,
    rationales: [
      "Correct. With 'neither...nor,' the verb agrees with the nearer subject, 'trustees' (plural), so 'were' is right.",
      "'Was' is singular, but the nearer subject 'trustees' is plural.",
      "'Has been' is singular and disagrees with the plural nearer subject.",
      "'Is' is singular, again disagreeing with 'trustees.'",
    ],
  },
  {
    id: "fs-7",
    skill: "form-structure",
    difficulty: 3,
    passage:
      "A prolific inventor whose patents spanned fields from optics to metallurgy, ______ during her later years to mentoring young engineers.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      "Hertha Ayrton devoted herself",
      "the work of Hertha Ayrton turned",
      "it was Hertha Ayrton who devoted her energy",
      "mentoring became Hertha Ayrton's focus",
    ],
    answer: 0,
    rationales: [
      "Correct. The opening modifier describes 'a prolific inventor,' so 'Hertha Ayrton' must be the subject that directly follows.",
      "'The work' was not the prolific inventor; this leaves the modifier dangling.",
      "The cleft 'it was...who' makes 'it,' not Ayrton, the grammatical subject, misaligning the modifier.",
      "'Mentoring' was not the prolific inventor, so the introductory phrase dangles.",
    ],
  },
  // =========================================================================
  // GOLDEN GENRE SET — original, exam-faithful passages across the four
  // genres the Digital SAT draws from: literature/poetry, history/founding-
  // style documents, science (incl. quantitative), and humanities/social
  // science. All passages are original compositions.
  // =========================================================================

  // ----- Literature: original poem "The Tenant" -----
  {
    id: "ts-6",
    skill: "text-structure",
    difficulty: 3,
    passage:
      "The following is an original poem.\n\nEach autumn I take down the summer's things—\nthe striped chairs, the awning's faded green—\nand store them where the field mice make their kings,\nand shut the season like a book unseen.\nI tell myself the house is mine to keep.\nThe house says nothing, patient as a stone;\nit has outlasted owners in their sleep\nand will outlast me, standing here alone.",
    prompt:
      "Which choice best describes the function of the poem's final three lines?",
    choices: [
      "They reveal the speaker's plan to sell the house before winter.",
      "They shift from the speaker's claim of ownership to a recognition that the house will endure beyond any owner.",
      "They catalog the specific repairs the aging house still requires.",
      "They describe the arrival of a new season at the house.",
    ],
    answer: 1,
    rationales: [
      "Nothing suggests a sale; the speaker calls the house 'mine to keep.'",
      "Correct. The turn from 'mine to keep' to the house outlasting its owners reframes possession as fleeting against the house's permanence.",
      "No repairs are mentioned; the closing lines concern permanence, not upkeep.",
      "Seasonal imagery appears earlier; the final lines dwell on endurance, not a new season.",
    ],
  },
  {
    id: "wc-8",
    skill: "words-in-context",
    difficulty: 3,
    passage:
      "The following is an original poem.\n\nI tell myself the house is mine to keep.\nThe house says nothing, patient as a stone;\nit has outlasted owners in their sleep\nand will outlast me, standing here alone.",
    prompt:
      "As used in the text, \"patient\" most nearly means",
    choices: ["enduring", "under medical care", "eager", "fragile"],
    answer: 0,
    rationales: [
      "Correct. A stone that 'outlast[s] owners' quietly persists; 'patient' here means enduring and uncomplaining.",
      "The medical sense of 'patient' is irrelevant to a stone or a house.",
      "'Eager' contradicts the still, silent permanence the image conveys.",
      "'Fragile' is the opposite of the lasting solidity the poem attributes to the house.",
    ],
  },
  {
    id: "ci-7",
    skill: "central-ideas",
    difficulty: 3,
    passage:
      "The following is an original poem.\n\nEach autumn I take down the summer's things—\nthe striped chairs, the awning's faded green—\nand store them where the field mice make their kings,\nand shut the season like a book unseen.\nI tell myself the house is mine to keep.\nThe house says nothing, patient as a stone;\nit has outlasted owners in their sleep\nand will outlast me, standing here alone.",
    prompt: "Which choice best states the main idea of the poem?",
    choices: [
      "Seasonal chores are a satisfying part of owning a home.",
      "Although the speaker asserts ownership, the poem suggests the house's permanence dwarfs any human claim to it.",
      "The speaker regrets having bought such an old and troublesome house.",
      "The house has fallen into disrepair through years of neglect.",
    ],
    answer: 1,
    rationales: [
      "The chores frame the poem but are not its point; the closing turn is about permanence.",
      "Correct. The speaker's 'mine to keep' is undercut by a house that 'will outlast me,' making human ownership fleeting.",
      "No regret about the purchase is expressed; the tone is reflective, not rueful.",
      "The house is described as enduring and solid, not neglected or decaying.",
    ],
  },

  // ----- Literature: original fiction (Mr. Adeyemi's shop) -----
  {
    id: "ci-8",
    skill: "central-ideas",
    difficulty: 2,
    passage:
      "The following is adapted from an original short story.\n\nMr. Adeyemi had run the corner shop for thirty years, and in all that time he had never once put up a sign advertising anything. The regulars knew where the good tomatoes were; the newcomers, he decided, could learn. When the supermarket opened two streets over, with its banners and its two-for-one flags, his daughter begged him to compete. He only moved the tomatoes a little nearer the door, and said nothing.",
    prompt: "Which choice best states the main idea of the text?",
    choices: [
      "Mr. Adeyemi decides to close his shop rather than face new competition.",
      "Even under pressure from a flashy new rival, Mr. Adeyemi holds to his understated way of running the shop.",
      "Mr. Adeyemi's daughter successfully persuades him to advertise.",
      "The supermarket's banners quickly drive Mr. Adeyemi out of business.",
    ],
    answer: 1,
    rationales: [
      "He does not close; he keeps running the shop his own way.",
      "Correct. Faced with the supermarket's banners, he makes only a tiny, quiet adjustment—consistent with a lifelong preference for restraint.",
      "He refuses to compete on the supermarket's terms; the daughter does not prevail.",
      "The text shows his response, not his ruin; no closure is described.",
    ],
  },
  {
    id: "in-7",
    skill: "inferences",
    difficulty: 3,
    passage:
      "The following is adapted from an original short story.\n\nWhen the supermarket opened two streets over, with its banners and its two-for-one flags, his daughter begged him to compete. He only moved the tomatoes a little nearer the door, and said nothing.",
    prompt: "Which choice most logically follows from the text?",
    choices: [
      "Mr. Adeyemi is willing to make only a small, quiet concession rather than adopt his rival's loud tactics.",
      "Mr. Adeyemi intends to install banners of his own the following week.",
      "Mr. Adeyemi agrees with his daughter that advertising is necessary.",
      "Mr. Adeyemi has decided to stop selling tomatoes altogether.",
    ],
    answer: 0,
    rationales: [
      "Correct. Moving the tomatoes slightly while saying nothing signals a minimal, understated adjustment—not the flashy competition urged on him.",
      "His silence and tiny gesture point away from adopting banners.",
      "By declining to compete on those terms, he implicitly rejects his daughter's advice.",
      "He repositions the tomatoes, showing he still means to sell them.",
    ],
  },
  {
    id: "et-6",
    skill: "evidence-textual",
    difficulty: 2,
    passage:
      "A student claims that Mr. Adeyemi has long preferred understatement to self-promotion in running his shop.",
    prompt:
      "Which quotation from the story would most directly support the student's claim?",
    choices: [
      "\"When the supermarket opened two streets over, with its banners and its two-for-one flags...\"",
      "\"In all that time he had never once put up a sign advertising anything.\"",
      "\"His daughter begged him to compete.\"",
      "\"The regulars knew where the good tomatoes were.\"",
    ],
    answer: 1,
    rationales: [
      "This describes the rival's tactics, not Mr. Adeyemi's own preference.",
      "Correct. Thirty years without a single advertising sign directly evidences a settled preference for understatement.",
      "This reports his daughter's plea, not his own long-standing habit.",
      "This shows his regulars' familiarity, not his aversion to self-promotion.",
    ],
  },

  // ----- History: original period-style address on public libraries -----
  {
    id: "ci-9",
    skill: "central-ideas",
    difficulty: 3,
    passage:
      "The following is adapted from an 1854 public address.\n\nSome among us call the free library a gift bestowed upon the poor, a charity to be granted or withheld as the public purse allows. I hold the opposite. A library is not alms but investment: the mechanic who reads by night returns to his bench the abler for it, and the commonwealth that lends him a book is repaid in the wealth his cleverer hands create. To lock knowledge behind a price is to starve the very industry we mean to feed.",
    prompt: "Which choice best states the main idea of the text?",
    choices: [
      "Free libraries are a form of charity that the public should fund when it can afford to.",
      "Free public libraries should be understood as a productive investment rather than as charity.",
      "Mechanics read more books at night than other workers do.",
      "Knowledge is most valuable when access to it is carefully restricted.",
    ],
    answer: 1,
    rationales: [
      "This is the view the speaker explicitly rejects ('I hold the opposite').",
      "Correct. The speaker reframes the library as 'not alms but investment,' repaid through the productivity it fosters.",
      "The reading mechanic is an illustration, not the central claim about libraries.",
      "The speaker argues the reverse: pricing knowledge 'starve[s]' industry.",
    ],
  },
  {
    id: "ts-7",
    skill: "text-structure",
    difficulty: 3,
    passage:
      "The following is adapted from an 1854 public address.\n\nSome among us call the free library a gift bestowed upon the poor, a charity to be granted or withheld as the public purse allows. I hold the opposite. A library is not alms but investment: the mechanic who reads by night returns to his bench the abler for it, and the commonwealth that lends him a book is repaid in the wealth his cleverer hands create. To lock knowledge behind a price is to starve the very industry we mean to feed.",
    prompt: "Which choice best describes the overall structure of the text?",
    choices: [
      "The speaker states a prevailing view, rejects it, and substitutes a contrary claim supported by reasoning.",
      "The speaker recounts the history of libraries from ancient to modern times.",
      "The speaker lists several unrelated benefits of reading in no particular order.",
      "The speaker concedes an opponent's point and abandons his own position.",
    ],
    answer: 0,
    rationales: [
      "Correct. He presents the 'charity' view, declares 'I hold the opposite,' and argues the 'investment' claim with a causal example and a warning.",
      "No historical timeline of libraries is given.",
      "The reasons are tightly connected to a single thesis, not a loose list.",
      "He rejects the opposing view rather than conceding to it.",
    ],
  },
  {
    id: "wc-9",
    skill: "words-in-context",
    difficulty: 3,
    passage:
      "The following is adapted from an 1854 public address.\n\nI hold the opposite. A library is not alms but investment: the mechanic who reads by night returns to his bench the abler for it, and the commonwealth that lends him a book is repaid in the wealth his cleverer hands create.",
    prompt: "As used in the text, \"alms\" most nearly means",
    choices: ["charity", "taxation", "wages", "machinery"],
    answer: 0,
    rationales: [
      "Correct. Set against 'investment' and echoing the earlier 'charity,' 'alms' means a charitable handout.",
      "'Taxation' is not what the library is being contrasted with here.",
      "'Wages' are earned payment, not the gift sense the contrast requires.",
      "'Machinery' has no basis in the passage's contrast between charity and investment.",
    ],
  },

  // ----- History: paired texts on 19th-century railroad expansion -----
  {
    id: "ct-6",
    skill: "cross-text",
    difficulty: 3,
    passage:
      "Text 1: A booster writes that the railroad is the great binder of the nation. Where once a journey between distant towns took weeks, goods and travelers now move in a day; markets once isolated are knit into a single thriving whole, and with them the country itself.\n\nText 2: A skeptic does not deny that the rails connect what was once far apart. Yet she observes that the same lines have ruined the local carters, seized farmland by decree, and gathered into a few men's hands a power over commerce that no town can check.",
    prompt:
      "Based on the texts, how would the author of Text 2 most likely respond to the argument in Text 1?",
    choices: [
      "By agreeing that the railroad has brought no real benefits to the nation.",
      "By granting the connective benefits Text 1 praises while stressing their social costs and dangerous concentration of power.",
      "By insisting that travel between distant towns is no faster than before.",
      "By arguing that local carters have prospered because of the railroads.",
    ],
    answer: 1,
    rationales: [
      "Text 2 explicitly does 'not deny that the rails connect,' so she affirms some benefit.",
      "Correct. She concedes the connective gains but emphasizes ruined carters, seized land, and power concentrated in a few hands.",
      "She accepts the speed of connection; her objection is to its costs.",
      "She says the opposite—the lines 'ruined the local carters.'",
    ],
  },

  // ----- Science: quantitative command of evidence (enzyme activity) -----
  {
    id: "eq-6",
    skill: "evidence-quant",
    difficulty: 3,
    passage:
      "A biologist measured the reaction rate of an enzyme at five temperatures:\n\n  10 °C: 12 units\n  20 °C: 28 units\n  30 °C: 45 units\n  40 °C: 40 units\n  50 °C: 15 units\n\nThe biologist concludes that the enzyme is most active at moderate temperatures, with activity falling off at both lower and higher extremes.",
    prompt:
      "Which choice most effectively uses data from the study to support the biologist's conclusion?",
    choices: [
      "Reaction rate rose steadily as the temperature increased from 10 °C to 50 °C.",
      "Reaction rate climbed from 12 units at 10 °C to a peak of 45 units at 30 °C, then declined to 15 units at 50 °C.",
      "Reaction rate was highest at 50 °C, the warmest temperature tested.",
      "Reaction rate was identical at 20 °C and 40 °C.",
    ],
    answer: 1,
    rationales: [
      "The rate did not rise steadily; it fell after 30 °C, so this misreads the data.",
      "Correct. A rise to a peak at 30 °C followed by a decline captures the 'most active at moderate temperatures' pattern with a falloff at both extremes.",
      "The rate at 50 °C (15) was among the lowest, not the highest.",
      "The rates differ: 28 units at 20 °C versus 40 units at 40 °C.",
    ],
  },

  // ----- Science: desert plants and gas exchange (CAM) -----
  {
    id: "ci-10",
    skill: "central-ideas",
    difficulty: 2,
    passage:
      "Most plants open the pores on their leaves during the day to take in carbon dioxide, losing water to the heat as they do. Certain desert succulents reverse this schedule. They open their pores only after dark, storing the carbon dioxide in chemical form until daylight, when they can use it to build sugars with their pores sealed shut against the sun.",
    prompt: "Which choice best states the main idea of the text?",
    choices: [
      "Desert succulents cannot carry out photosynthesis at all.",
      "Some desert plants take in carbon dioxide at night and use it by day, an unusual reversal of the typical schedule.",
      "Most plants avoid losing any water through their leaf pores.",
      "Carbon dioxide is more abundant in deserts than elsewhere.",
    ],
    answer: 1,
    rationales: [
      "The plants do photosynthesize; they build sugars by day from stored carbon dioxide.",
      "Correct. The passage contrasts the usual daytime schedule with succulents that take in CO2 at night and use it by day.",
      "The text says most plants do lose water when their pores open by day.",
      "The passage makes no claim about CO2 being more abundant in deserts.",
    ],
  },
  {
    id: "in-8",
    skill: "inferences",
    difficulty: 3,
    passage:
      "Most plants open their leaf pores during the day, losing water to the heat. Certain desert succulents instead open their pores only after dark, storing carbon dioxide until daylight, when they make sugars with their pores sealed against the sun.",
    prompt: "Which choice most logically completes the text?",
    choices: [
      "this night-time schedule helps the succulents conserve water in hot, dry conditions.",
      "the succulents grow faster than any other plants in the desert.",
      "desert succulents do not require carbon dioxide to survive.",
      "opening pores during the day would give the succulents more energy.",
    ],
    answer: 0,
    rationales: [
      "Correct. Since daytime pore-opening loses water to heat, opening only at night—when it is cooler—would reduce that loss, an advantage in a hot, dry climate.",
      "The text says nothing about comparative growth rates.",
      "They clearly need CO2; they go to lengths to take it in at night and store it.",
      "Daytime opening is associated with water loss, so this does not follow.",
    ],
  },

  // ----- Science: paired texts on a species' return -----
  {
    id: "ct-7",
    skill: "cross-text",
    difficulty: 3,
    passage:
      "Text 1: After decades of absence, sea otters have returned to the bay. To the conservation group that tracked them, the otters' comeback is proof that the bay's ecosystem has recovered its former health.\n\nText 2: A marine ecologist urges caution. The otters, she notes, may have returned not because the wider ecosystem healed but because a competing predator declined for reasons of its own. A single species' return, she argues, is a hopeful sign but not by itself evidence of broad recovery.",
    prompt:
      "Based on the texts, the marine ecologist (Text 2) would most likely characterize the conservation group's conclusion (Text 1) as",
    choices: [
      "confirmed, because the otters could not survive in an unhealthy bay.",
      "premature, because a single species' return may have other causes and does not by itself show broad recovery.",
      "irrelevant, because sea otters have no effect on their ecosystem.",
      "obvious, because everyone already expected the otters to return.",
    ],
    answer: 1,
    rationales: [
      "She questions the inference rather than confirming it, offering an alternative cause.",
      "Correct. She stresses the return could stem from a rival predator's decline and is 'not by itself evidence of broad recovery.'",
      "She treats the otters as ecologically meaningful; her point is about what their return proves.",
      "She frames the conclusion as uncertain, not as something obvious or expected.",
    ],
  },

  // ----- Humanities/social science: behavioral economics (endowment effect) -----
  {
    id: "ci-11",
    skill: "central-ideas",
    difficulty: 3,
    passage:
      "Classical economics long assumed that a person values an object the same whether buying or selling it. Experiments tell another story. When participants were given a mug and asked the least they would accept to part with it, they demanded roughly twice what other participants, asked the most they would pay for the same mug, were willing to offer. Merely owning the mug, it seemed, had inflated its worth in the owner's eyes.",
    prompt: "Which choice best states the main idea of the text?",
    choices: [
      "People are generally unwilling to buy or sell ordinary objects like mugs.",
      "Simply owning an object can raise how much a person values it, contradicting a long-standing economic assumption.",
      "Classical economics accurately predicts how people price the things they own.",
      "Participants in the experiment could not decide how much the mug was worth.",
    ],
    answer: 1,
    rationales: [
      "The experiment shows people readily name buying and selling prices; unwillingness is not the point.",
      "Correct. Owners demanded about twice what buyers offered, showing ownership inflates value—against the classical assumption of a single value.",
      "The evidence contradicts the classical assumption rather than confirming it.",
      "Participants gave clear prices; the finding is the gap between owners' and buyers' values.",
    ],
  },
  {
    id: "ts-8",
    skill: "text-structure",
    difficulty: 2,
    passage:
      "Classical economics long assumed that a person values an object the same whether buying or selling it. Experiments tell another story. When participants were given a mug and asked the least they would accept to part with it, they demanded roughly twice what other participants, asked the most they would pay, were willing to offer.",
    prompt: "Which choice best describes the overall structure of the text?",
    choices: [
      "It states a traditional assumption and then presents experimental evidence that overturns it.",
      "It defines an economic term and lists its everyday uses.",
      "It compares two experiments and explains why both failed.",
      "It traces the career of a single influential economist.",
    ],
    answer: 0,
    rationales: [
      "Correct. The text gives the classical assumption, signals a turn ('Experiments tell another story'), then supplies contradicting data.",
      "No term is formally defined and no list of uses appears.",
      "Only one experiment is described, and it is presented as revealing, not failed.",
      "No economist's career is discussed.",
    ],
  },

  // ----- Humanities: art criticism (original) -----
  {
    id: "wc-10",
    skill: "words-in-context",
    difficulty: 3,
    passage:
      "The gallery's new director had inherited a collection famous for its restraint—muted portraits, quiet interiors, nothing that raised its voice. Her first exhibition hung these beside vast canvases of pure, clashing color. Critics expecting harmony found instead a deliberate ______: each room set the old hush against the new clamor, and the friction was plainly the point.",
    prompt:
      "Which choice completes the text with the most logical and precise word?",
    choices: ["dissonance", "symmetry", "restoration", "nostalgia"],
    answer: 0,
    rationales: [
      "Correct. Setting 'the old hush against the new clamor' so that 'friction was plainly the point' describes a deliberate dissonance.",
      "'Symmetry' implies balanced harmony, the very thing the critics did not find.",
      "'Restoration' suggests repair or return, unrelated to the clash being staged.",
      "'Nostalgia' is a longing for the past, not the tension between old and new works.",
    ],
  },
  {
    id: "in-9",
    skill: "inferences",
    difficulty: 3,
    passage:
      "The gallery's new director hung the collection's muted, restrained portraits beside vast canvases of pure, clashing color. Critics expecting harmony found instead a deliberate clash: each room set the old hush against the new clamor, and the friction was plainly the point.",
    prompt: "Which choice most logically follows from the text?",
    choices: [
      "The director wanted viewers to notice the tension between old restraint and new boldness rather than a seamless blend.",
      "The director intended to sell the older portraits as quickly as possible.",
      "The director believed the new canvases were of poor artistic quality.",
      "The director hoped visitors would fail to notice the older works entirely.",
    ],
    answer: 0,
    rationales: [
      "Correct. If 'the friction was plainly the point,' the director deliberately staged the contrast for viewers to perceive.",
      "Nothing about selling the portraits is suggested.",
      "She features the new canvases prominently, implying she values them.",
      "The design foregrounds the old works by contrast, not hides them.",
    ],
  },

  // ----- Science: rhetorical synthesis from notes -----
  {
    id: "rs-6",
    skill: "rhetorical-synthesis",
    difficulty: 3,
    passage:
      "While researching, a student has taken the following notes:\n\n• Mangroves are trees that grow in salty coastal water.\n• Their tangled roots slow incoming waves.\n• During storms, coastlines behind mangroves flood far less than exposed ones.\n• Mangroves also store large amounts of carbon in their soil.\n• Many mangrove forests have been cleared for development.",
    prompt:
      "The student wants to emphasize how mangroves protect coastlines during storms. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
    choices: [
      "Mangroves are salt-tolerant trees, and many of their forests have been cleared for development.",
      "Because their tangled roots slow incoming waves, coastlines behind mangroves flood far less during storms than exposed ones do.",
      "Mangroves store large amounts of carbon in their coastal soils.",
      "Mangroves are trees that grow in salty coastal water.",
    ],
    answer: 1,
    rationales: [
      "Clearing and salt tolerance are beside the point of storm protection.",
      "Correct. Linking the wave-slowing roots to reduced flooding behind mangroves directly emphasizes their protective role in storms.",
      "Carbon storage is a different benefit, not coastal protection during storms.",
      "This defines mangroves but says nothing about protecting coastlines.",
    ],
  },
];

SAT_TAXONOMY.questionCountBySkill = SAT_QUESTIONS.reduce((acc, q) => {
  acc[q.skill] = (acc[q.skill] || 0) + 1;
  return acc;
}, {});
