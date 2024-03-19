
class Dice {
    constructor(faces = 6) {
        faces = parseInt(faces);
        this.faces = !isNaN(faces) && isFinite(faces) && faces > 1
    }

    roll = () => {
        const flatResult = Math.floor(Math.random() * this.faces) + 1;
        return { result: flatResult, dice: flatResult, rate: 0 };
    };
}

class D20 extends Dice {
    constructor() {
        super(20);
    }

    roll = ({ modifier = 0, dc = 0 } = {}) => {
        const flatResult = Math.floor(Math.random() * this.faces) + 1;
        let diff = (flatResult + modifier) - dc;
        if (diff < 0) rate = -1;
        if (diff >= 0) rate = 1;
        if (diff >= 10) rate += 1;
        if (diff <= 10) rate -= 1;
        if (flatResult === 20) rate += 1;
        if (flatResult === 1) rate -= 1;
        if (rate > 2) rate = 2;
        if (rate < -2) rate = -2;
        return { result: flatResult + modifier, dice: flatResult, rate: rate };
    }
}

class Condition {
    constructor(
        name = "",
        ref = "",
        level = 0,
    ) {
        this.name = typeof name === 'string' ? name : "";
        this.ref = typeof ref === 'string' ? ref : "";
        this.level = typeof level === 'number' && level > 0 ? level : 0;
    }

    static parse = (object) => {
        if (!(object instanceof Object)) return undefined;
        return new Condition(
            object.name,
            object.ref,
            parseInt(object.level),
        )
    }

    toHTML = () => {
        const ruleElement = document.createElement("div");
        ruleElement.classList.add("rule");

        const ruleHeader = document.createElement("header");
        ruleElement.appendChild(ruleHeader);
        
        const conditionElement = document.createElement("div");
        conditionElement.classList.add("tag");
        ruleHeader.appendChild(conditionElement);
        
        const actionsElement = document.createElement("div");
        ruleHeader.appendChild(actionsElement);
        
        const conditionContent = document.createElement("div");
        conditionContent.classList.add("tag-content");
        conditionElement.appendChild(conditionContent);
        
        const conditionName = document.createElement("div");
        conditionName.classList.add("tag-txt");
        conditionName.innerText = this.name;
        conditionContent.appendChild(conditionName);

        if (this.level) {
            const conditionLevel = document.createElement("div");
            conditionLevel.classList.add("tag-lvl");
            conditionLevel.innerText = this.level;
            conditionContent.appendChild(conditionLevel);
        }
        return conditionElement;
    }
}

class ConditionRule {
    constructor(
        name = "",
        ref = "",
        description = [],
        overrides = [],
        conditionsGained = [],
        incremental = false,
        objectOnly = false,
    ) {
        this.name = typeof name === 'string' ? name : "";
        this.ref = typeof ref === 'string' ? ref : "";
        this.description = Array.isArray(description) ? description.filter(x => typeof x === 'string') : [];
        this.overrides = Array.isArray(overrides) ? overrides.filter(x => typeof x === 'string') : [];
        this.conditionsGained = Array.isArray(conditionsGained) ? conditionsGained.filter(x => x instanceof Condition) : [];
        this.incremental = typeof incremental === 'boolean' ? incremental : false;
        this.objectOnly = typeof objectOnly === 'boolean' ? objectOnly : false;
    }

    static parse = (object) => {
        if (!(object instanceof Object)) return undefined;
        return new ConditionRule(
            object.name,
            object.ref,
            object.description,
            object.overrides,
            object.conditionsGained?.map(x => Condition.parse(x)),
            object.incremental,
            object.objectOnly,
        )
    }

    toHTML = ({ callback_toggleContent = null, callback_applyCondition = null, callback_ShowApplyConditions = null } = {}) => {
        const ruleElement = document.createElement("div");
        ruleElement.classList.add("rule");
        ruleElement.id = this.ref;

        const ruleHeader = document.createElement("header");
        ruleElement.appendChild(ruleHeader);

        const tagElement = document.createElement("div");
        tagElement.classList.add("tag");
        ruleHeader.appendChild(tagElement);

        const tagName = document.createElement("div");
        tagName.classList.add("tag-txt");
        tagName.innerText = this.name;
        tagElement.appendChild(tagName);

        const actionsElement = document.createElement("div");
        actionsElement.classList.add("actions");
        ruleHeader.appendChild(actionsElement);

        if (callback_toggleContent) {
            const toggleAction = document.createElement("div");
            toggleAction.classList.add("action");
            toggleAction.classList.add("toggle-content");
            toggleAction.classList.add("open");
            toggleAction.setAttribute("for", this.ref);
            toggleAction.addEventListener('click', (e) => callback_toggleContent(e));
            toggleAction.innerText = "▲";
            actionsElement.appendChild(toggleAction);
        }

        if (callback_applyCondition) {
            const applyAction = document.createElement("div");
            applyAction.classList.add("action");
            applyAction.addEventListener('click', _ => {
                callback_applyCondition(this);
                callback_ShowApplyConditions();
            });
            applyAction.innerText = "+";
            actionsElement.appendChild(applyAction);
        }

        const contentElement = document.createElement("div");
        contentElement.classList.add("toggle-content-target");
        contentElement.style.display = "none";
        let contentRow;
        this.description.forEach(row => {
            contentRow = document.createElement("p");
            contentRow.innerText = row;
            contentElement.appendChild(contentRow);
        });
        ruleElement.appendChild(contentElement);
        
        return ruleElement;
    }
}

class ConditionManager {
    listTargetId = "ConditionsList";
    currentTargetId = "CurrentConditions";
    conditions = [];
    appliedConditions = [];

    constructor(conditions) {
        if (!Array.isArray(conditions)) return this;
        conditions.forEach(condition => {
            const currentLoopCondition = ConditionRule.parse(condition);
            if (!(currentLoopCondition instanceof ConditionRule)) return;
            this.conditions.push(currentLoopCondition);
        });
    }

    toggleContent = (event) => {
        const sender = event.currentTarget;
        const blockId = sender.getAttribute("for");
        const target = sender.closest(`#${blockId}`)?.querySelector(`.toggle-content-target`);
        if (sender.classList.contains("open")) {
            sender.classList.toggle("open", false);
            sender.classList.toggle("close", true);
            target.style.display = 'block';
        } else {
            sender.classList.toggle("close", false);
            sender.classList.toggle("open", true);
            target.style.display = 'none';
        }
    }

    applyCondition = (rule, level = 0) => {
        let appliedCondition;
        if (rule instanceof Condition) appliedCondition = rule;
        else appliedCondition = new Condition(rule.name, rule.ref, !isNaN(level) && isFinite(level) && level > 0 ? level : 0);
        if (rule.incremental && appliedCondition.level === 0) {
            let conditionLevel = -1;
            while(isNaN(conditionLevel) || conditionLevel < 0) {
                conditionLevel = parseInt(prompt("Livello della condizione?"));
            }
            appliedCondition.level = conditionLevel;
        }
        if (this.appliedConditions.filter(x => x.ref === rule.ref).length > 0) {
            if (rule.incremental) {
                for (let index = 0; index < this.appliedConditions.length; index++) {
                    if (this.appliedConditions[index].ref === rule.ref) {
                        if (appliedCondition.level < 1) this.appliedConditions.splice(index,1);
                        else if (appliedCondition.level > this.appliedConditions[index].level) this.appliedConditions[index].level = appliedCondition.level;
                    }
                }
            }
        }
        else {
            this.appliedConditions.push(appliedCondition);
            if (rule.conditionsGained?.length) {
                rule.conditionsGained.forEach(conditionGained => {
                    const conditionRef = this.conditions.find(x => x.ref === conditionGained.ref);
                    if (conditionRef && this.appliedConditions.filter(x => x.ref === conditionRef.ref).length === 0) this.applyCondition(conditionRef, conditionGained.level);
                });
            }
        }
    }

    showAppliedConditions = () => {
        const target = document.getElementById(this.currentTargetId);
        target.innerHTML = "";
        this.appliedConditions.forEach(appliedCondition => target.appendChild(appliedCondition.toHTML()));
    }
    
    showList = () => {
        const target = document.getElementById(this.listTargetId);
        this.conditions.forEach(rule => {
            const element = rule.toHTML({ callback_toggleContent: this.toggleContent, callback_applyCondition: this.applyCondition, callback_ShowApplyConditions: this.showAppliedConditions });
            target.appendChild(element);
        });
    }
}

window.onload = _ => {

    const cm = new ConditionManager(conditions);
    cm.showList();
    
}

function createActionElement() {
    const actionElement = document.createElement("div");
    actionElement.classList.add("action");
    const actionHeader = document.createElement("header");
    const actionName = document.createElement("h2");
    actionName.classList.add("name");
    actionHeader.appendChild(actionName);
    const actionTagList = document.createElement("div");
    actionTagList.classList.add("tag-list");
    actionHeader.appendChild(actionTagList);
    const actionTrigger = document.createElement("div");
    actionTrigger.classList.add("trigger");
    actionHeader.appendChild(actionTrigger);
    const actionRequirements = document.createElement("div");
    actionRequirements.classList.add("requirements");
    actionHeader.appendChild(actionRequirements);
    actionElement.appendChild(actionHeader);
    const actionContent = document.createElement("div");
    actionContent.classList.add("content");
    actionElement.appendChild(actionContent);
    const actionDescription = document.createElement("p");
    actionContent.appendChild(actionDescription);
    const actionEffects = document.createElement("div");
    actionEffects.classList.add("success-failure-effects");
    actionContent.appendChild(actionEffects);
    return actionElement;
}

const conditions = [
    {
        name: "Abbagliato",
        ref: "dazzled",
        description: [
            "I tuoi occhi sono sovrastimolati. Se la vista è il tuo unico Senso Preciso, tutte le creature e gli oggetti sono Occultati nei tuoi confronti.",
        ],
    },
    {
        name: "Accecato",
        ref: "blinded",
        overrides: ["dazzled"],
        description: [
            "Non vedi nulla. Consideri il terreno normale come Difficile e non puoi individuare nulla tramite la vista. Ottieni un Fallimento Critico automatico nelle prove di Percezione che richiedono la vista e, se è il tuo unico Senso Preciso, subisci penalità di status -4 alle prove di Percezione. Sei Immune agli effetti visivi. Accecato prevale su Abbagliato.",
        ],
        //vision: {perception: {mod: -4, successRate: -2}}
    },
    {
        name: "Accelerato",
        ref: "quickened",
        description: [
            "Guadagni 1 azione addizionale a ogni round, all'inizio del tuo turno. Molti effetti che ti rendono accelerato specificano il tipo di azioni che puoi usare con quest'azione addizionale. Se più fonti ti rendono accelerato, puoi usare l'azione extra per qualsiasi azione singola concessa da uno qualsiasi degli effetti che ti rendono accelerato. Dato che accelerato ha effetto all'inizio del tuo turno, non ottieni subito azioni se diventi accelerato durante il tuo turno.",
        ],
    },
    {
        name: "Affascinato",
        ref: "fascinated",
        description: [
            "Sei costretto a concentrare la tua attenzione su qualcosa, e ciò ti distrae da quanto avviene attorno a te. Subisci penalità di status -2 alle prove di Percezione e alle prove di Abilità, e non puoi usare azioni con il Tratto Concentrazione a meno che esse o le loro conseguenze previste non siano correlate al soggetto della tua fascinazione (a discrezione del GM). Per esempio, puoi essere in grado di Individuare e Ricordare Conoscenze circa il soggetto ma, probabilmente, non potrai lanciare un incantesimo su una creatura differente. Questa condizione termina se una creatura usa azioni ostili contro di te o contro qualsiasi tuo alleato."
        ],
    },
    {
        name: "Affaticato",
        ref: "fatigued",
        description: [
            "Sei stanco e non hai molta energia a disposizione. Subisci penalità di status -1 a CA e Tiri Salvezza. In esplorazione, non puoi svolgere un'Attività in Esplorazione mentre viaggi. Ti riprendi dalla fatica dopo una notte intera di riposo.",
        ],
    },
    {
        name: "Afferrato",
        ref: "grabbed",
        conditionsGained: [{ ref: "off-guard" }, { ref: "immobilized" }],
        description: [
            "Sei tenuto fermo da un'altra creatura, cosa che ti da le condizioni Immobilizzato e Impreparato. Se tenti un'azione Maneggiare mentre sei afferrato, devi superare una prova semplice con CD 5 o perderla; tenta la prova prima di usare l'azione ma prima di applicare qualsiasi effetto.",
        ],
    },
    {
        name: "Amichevole",
        ref: "friendly",
        description: [
            "Questa condizione riflette l'atteggiamento di una creatura nei confronti di un personaggio in particolare; solo gli effetti sovrannaturali (come gli Incantesimi) possono imporla ai personaggi giocanti. Una creatura amichevole verso un personaggio lo trova piacevole. Quel personaggio può tentare un'azione Richiedere verso una creatura amichevole, e la creatura amichevole probabilmente accetterà una richiesta semplice e sicura il cui compimento non risulti gravoso. Se il personaggio o un suo alleato usa azioni ostili contro la creatura, questa guadagna una condizione di atteggiamento peggiore a seconda della gravita dell'azione ostile, a discrezione del GM.",
        ],
    },
    {
        name: "Assordato",
        ref: "deafened",
        description: [
            "Non sei in grado di udire nulla. Ottieni un Fallimento Critico automatico nelle prove di Percezione che richiedono l'uso dell'udito. Subisci penalità di status -2 alle prove di Percezione per l'Iniziativa e alle prove che coinvolgono il suono ma fanno affidamento anche sugli altri sensi. Se compi un'azione con il tratto Uditivo, devi superare una prova semplice con CD 5 o l'azione è perduta; tenta la prova dopo aver speso l'azione, ma prima di applicarne gli effetti. Sei Immune agli effetti uditivi.",
        ],
    },
    {
        name: "Collaborativo",
        ref: "helpful",
        description: [
            "Questa condizione riflette l'atteggiamento di una creatura nei confronti di un personaggio in particolare; solo gli effetti sovrannaturali (come gli Incantesimi) possono imporla ai personaggi giocanti. Una creatura collaborativa verso un personaggio desidera aiutarlo attivamente. Accetterà azioni Richiedere ragionevoli da quel personaggio, fintanto che tali richieste non vanno a detrimento dei suoi scopi o della sua qualità di vita. Se il personaggio o un suo alleato usa azioni ostili contro la creatura, questa guadagna una condizione di atteggiamento peggiore a seconda della gravita dell'azione ostile, a discrezione del GM.",
        ],
    },
    {
        name: "Condannato",
        ref: "doomed",
        incremental: true,
        description: [
            "La tua anima è nelle grinfie di una forza potente che ti trascina verso la morte. Condannato include sempre un valore. Il valore di Morente a cui muori è ridotto del tuo valore di condannato. Se il tuo valore di Morente massimo si riduce a 0, muori all'istante. Quando muori, non sei più condannato.",
            "Il tuo valore di condannato diminuisce di 1 a ogni notte piena di riposo.",
        ],
    },
    {
        name: "Confuso",
        ref: "confused",
        conditionsGained: [{ ref: "off-guard" }],
        description: [
            "Non ti rendi conto appieno di ciò che accade e attacchi alla cieca. Sei Impreparato, non consideri nessuno come tuo alleato (anche se gli altri possono considerarti alleato) e non puoi Ritardare, Preparare o usare reazioni.",
            "Usi tutte le tue azioni per Colpire o lanciare trucchetti offensivi, ma il GM può farti usare altre azioni per facilitare gli attacchi, come sguainare un'arma, muoverti in modo da avere il bersaglio in gittata e così via. I tuoi bersagli sono determinati casualmente dal GM. Se non hai altri bersagli disponibili, bersagli te stesso, colpendoti automaticamente ma senza ottenere un colpo critico. Se ti è impossibile attaccare o lanciare incantesimi, farfugli parole incoerenti, sprecando le tue azioni.",
            "Ogni volta che subisci danni da un attacco o incantesimo, puoi tentare una prova semplice con CD 11 per riprenderti dalla confusione e porre fine alla condizione.",
        ],
    },
    {
        name: "Controllato",
        ref: "controlled",
        description: [
            "Qualcun altro prende le tue decisioni al tuo posto, in genere perché sei costretto o Dominato magicamente. La creatura che ti controlla indica ciò che fai e può usare qualsiasi tua azione, inclusi attacchi, reazioni o persino Ritardare; in genere non è tenuta a spendere le proprie azioni mentre ti controlla.",
        ],
    },
    {
        name: "Danno Persistente",
        ref: "persistent_damage",
        description: [
            "Il danno persistente deriva da effetti come acido, bruciature o molte altre situazioni ed è indicato come X danni da [tipo] persistenti, dove la X e la quantità di danni inflitti e [tipo] e il tipo di danni. Anziché subire il danno persistente immediatamente, lo subisci alla fine di ciascun tuo turno finché hai la condizione, tirando i dadi dei danni ogni volta. Dopo aver subito il danno persistente, fai una prova semplice con CD 15 per determinare se guarisci dal danno persistente. Se la superi, la condizione termina.",
        ],
    },
    {
        name: "Ferito",
        ref: "wounded",
        incremental: true,
        description: [
            "Sei stato gravemente compromesso. Se perdi la condizione Morente, e non hai la condizione ferito, diventi ferito 1. Se l'hai già quando perdi la condizione Morente, il valore della tua condizione ferito aumenta di 1. Se ottieni la condizione Morente mentre sei ferito, aumenta il valore della condizione Morente del tuo valore di ferito.",
            "La condizione ferito termina se qualcuno ti fa recuperare con successo Punti Ferita con Curare Ferite, o se vieni riportato al tuo massimo di Punti Ferita e riposi per 10 minuti.",
        ],
    },
    {
        name: "Immobilizzato",
        ref: "Immobilized",
        description: [
            "Non puoi usare azioni col tratto movimento. Se sei immobilizzato da qualcosa che ti tiene fermo e una forza esterna ti muoverebbe fuori dal tuo quadretto, questa deve superare una prova contro la CD dell'effetto che ti blocca o la difesa appropriata (in genere la CD di Tempra) di un mostro che ti blocca.",
        ],
    },
    {
        name: "Impreparato",
        ref: "off-guard",
        description: [
            "Sei distratto o comunque incapace di dedicare tutta la tua attenzione alla difesa. Subisci penalità di circostanza -2 alla CA. Alcuni effetti ti danno la condizione impreparato solo nei confronti di alcune creature o attacchi; altri, specialmente le condizioni, ti possono rendere impreparato in generale nei confronti di qualsiasi cosa o persona. Se una regola non specifica che la condizione si applica solo a certe circostanze, si applica a tutte; per esempio, molti effetti dicono semplicemente Il bersaglio è impreparato.",
        ],
    },
    {
        name: "In Fuga",
        ref: "fleeing",
        description: [
            "Sei costretto a fuggire a causa del panico o di un'altra compulsione. Nel tuo turno, devi spendere ogni tua azione per cercare di scappare dalla fonte della condizione in fuga nel modo più sbrigativo possibile (per esempio usando azioni di movimento per fuggire o aprendo porte che ti sbarrano la strada). La fonte e in genere l'effetto o l'incantatore che ti ha dato la condizione, anche se alcuni effetti possono indicare che la fonte sia un'altra. Non puoi Preparare o Ritardare mentre sei in fuga.",
        ],
    },
    {
        name: "Indebolito",
        ref: "enfeebled",
        incremental: true,
        description: [
            "Sei fisicamente fiacco. Indebolito include sempre un valore. Quando sei indebolito, subisci penalità di status pari al valore di condizione alle prove e alle CD basate sulla Forza, inclusi Tiri per Colpire in mischia basati sulla Forza, Tiri per i Danni basati sulla Forza e prove di Atletica.",
        ],
    },
    {
        name: "Indifferente",
        ref: "indifferent",
        description: [
            "Questa condizione riflette l'atteggiamento di una creatura nei confronti di un personaggio in particolare; solo gli effetti sovrannaturali (come gli Incantesimi) possono imporla ai personaggi giocanti. A una creatura indifferente verso un personaggio non importa cosa gli accada. Le regole presuppongono che l'atteggiamento di una creatura sia indifferente se non è specificato diversamente.",
        ],
    },
    {
        name: "Ingombrato",
        ref: "encumbered",
        conditionsGained: [{ ref: "clumsy", level: 1 }],
        description: [
            "Stai portando più peso di quello che puoi sopportare. Mentre sei ingombrato, sei Maldestro 1 e subisci penalità di -3 metri a tutte le tue Velocità, Come per tutte le penalità alla tua Velocità, questo non riduce la tua Velocità al di sotto di 1,5 metri.",
        ],
    },
    {
        name: "Inosservato",
        ref: "unnoticed",
        description: [
            "Se sei inosservato da una creatura, questa è inconsapevole della tua presenza. Quando sei inosservato, sei anche Non Individuato da quella creatura. Questa condizione serve per capacità che possono essere usate solo contro bersagli totalmente inconsapevoli della tua presenza.",
        ],
    },
    {
        name: "Invisibile",
        ref: "invisible",
        description: [
            "Fintanto che sei invisibile, non puoi essere visto. Sei Non Individuato da chiunque. Le creature possono tentare di trovarti con Individuare; se una creatura supera la sua prova di Percezione contro la tua CD di Furtività, diventi Nascosto a quella creatura finché non ti Muovi Furtivamente per divenire nuovamente Non Individuato. Se diventi invisibile mentre qualcuno ti vede, inizi Nascosto all'osservatore, anziché Non Individuato, finché non ti Muovi Furtivamente con Successo. Non puoi diventare Osservato mentre sei invisibile, se non tramite capacità speciali o magie.",
        ],
    },
    {
        name: "Maldestro",
        ref: "clumsy",
        incremental: true,
        description: [
            "I tuoi movimenti si fanno impacciati e imprecisi. Maldestro include sempre un valore. Subisci penalità di status pari al valore di condizione alle prove e alle CD basate su Destrezza, inclusi CA, Tiri Salvezza su Riflessi, Tiri per Colpire a distanza e prove di abilità che utilizzano Acrobazia, Furtività e Furto.",
        ],
    },
    {
        name: "Maldisposto",
        ref: "unfriendly",
        description: [
            "Questa condizione riflette l'atteggiamento di una creatura nei confronti di un personaggio in particolare; solo gli effetti sovrannaturali (come gli Incantesimi) possono imporla ai personaggi giocanti. Una creatura maldisposta verso un personaggio lo trova sgradevole, non si fida di lui e non accetta azioni Richiedere da lui.",
        ],
    },
    {
        name: "Morente",
        ref: "dying",
        incremental: true,
        description: [
            "Ti stai dissanguando o ti ritrovi comunque in punto di morte. Fintanto che hai questa condizione, sei Privo di Sensi. Morente include sempre un valore: se questo valore raggiunge morente 4, Muori. Se sei morente, a ogni round, all'inizio del tuo turno, devi tentare una prova per il Recupero per determinare se migliori o peggiori. Se subisci danni mentre sei morente, la tua condizione morente aumenta di 1, o di 2 se subisci danni dal colpo critico di un nemico o per un fallimento critico su un tuo Tiro Salvezza.",
            "Se perdi la condizione morente superando una prova per il recupero e hai ancora 0 Punti Ferita, resti Privo di Sensi, ma puoi svegliarti come descritto in tale condizione. Se hai 1 Punto Ferita o più, perdi automaticamente la condizione morente e ti svegli. Ogni volta che perdi la condizione morente ottieni la condizione Ferito 1, o aumenti di 1 il tuo valore di Ferito se ce l'hai già.",
        ],
    },
    {
        name: "Nascosto",
        ref: "hidden",
        description: [
            "Fintanto che sei nascosto a una creatura, questa sa in quale zona ti trovi ma non sa dire dove con precisione. In genere, diventi nascosto usando Furtività per Nasconderti. Quando Individui una creatura usando solo sensi imprecisi, essa rimane nascosta anziché diventare Osservata. Una creatura per cui sei nascosto é Impreparata nei tuoi confronti, e deve superare una prova semplice con CD 11 quando ti bersaglia con un attacco, un incantesimo o un altro effetto, altrimenti non riesce a influenzarti. Gli effetti ad area non sono soggetti a tale prova semplice.",
            "Una creatura può essere in grado di usare l'azione Individuare per cercare di osservarti.",
        ],
    },
    {
        name: "Nauseato",
        ref: "sickened",
        incremental: true,
        description: [
            "Ti senti male. Nauseato include sempre un valore. Subisci penalità di status pari a questo valore a tutte le tue prove e CD. Non puoi ingerire nulla volontariamente (pozioni ed elisir compresi) da nauseato.",
            "Puoi spendere un'azione per vomitare nel tentativo di riprenderti, cosa che ti consente di tentare subito un Tiro Salvezza su Tempra contro la CD dell'effetto che ti ha nauseato. Se hai successo, riduci il tuo valore di nauseato di 1 (o di 2 con un successo critico).",
        ],
    },
    {
        name: "Non Individuato",
        ref: "undetected",
        description: [
            "Quando sei non individuato da una creatura, essa non può vederti, non ha idea di quale quadretto occupi e non può bersagliarti, ma puoi comunque essere influenzato da capacità con Effetti ad Area. Fintanto che sei non individuato da una creatura, essa è Impreparata nei tuoi confronti.",
            "Una creatura da cui sei non individuato può cercare di bersagliarti indovinando in quale quadretto ti trovi. Deve scegliere un quadretto e tentare un attacco; ciò funziona come quando si prende di mira una creatura Nascosta (cosa che richiede una Prova Semplice con CD 11), ma la Prova Semplice e il Tiro per Colpire vengono effettuati in segreto dal GM, che non rivela se l'attacco ha mancato a causa della scelta del quadretto errato o di un Fallimento nella prova o nel Tiro per Colpire.",
            "Una creatura può usare l'azione Individuare per cercare di trovarti.",
        ],
    },
    {
        name: "Occultato",
        ref: "concealed",
        description: [
            "Fintanto che sei occultato nei confronti di una creatura, per esempio se sei avvolto da una nebbia fitta, quella creatura ha difficoltà a vederti. Puoi ancora essere Osservato, ma è arduo prenderti di mira. Se sei occultato nei confronti di una creatura, questa deve superare una prova semplice con CD 5 quando ti bersaglia con un attacco, incantesimo o altro effetto. Gli effetti ad area non sono soggetti a questa prova semplice. Se la prova fallisce, l'attacco, incantesimo o effetto non ti influenza.",
        ],
    },
    {
        name: "Osservato",
        ref: "observed",
        description: [
            "Qualsiasi cosa sia in piena vista è osservato. Se una creatura cerca di evitare l'individuazione, per esempio usando Furtività per Nascondersi, può diventare Nascosta o Non Individuata anziché osservata. Se hai un altro senso preciso al posto di o oltre alla vista, puoi essere in grado di osservare una creatura o un oggetto usando quel senso.",
            "Puoi osservare una creatura solo con sensi precisi. Quando Individui una creatura usando solo sensi imprecisi, essa rimane Nascosta anziché osservata.",
        ],
    },
    {
        name: "Ostile",
        ref: "hostile",
        description: [
            "Questa condizione riflette l'atteggiamento di una creatura nei confronti di un personaggio in particolare; solo gli effetti sovrannaturali (come gli Incantesimi) possono imporla ai personaggi giocanti. Una creatura ostile verso un personaggio cerca attivamente di danneggiarlo. Non lo attacca necessariamente, ma non accetta azioni Richiedere da esso.",
        ],
    },
    {
        name: "Paralizzato",
        ref: "paralyzed",
        conditionsGained: [{ ref: "off-guard" }],
        description: [
            "Il tuo corpo completamente bloccato. Hai la condizione Impreparato e non puoi agire, se non per Ricordare Conoscenze e altre azioni che richiedono solo l'uso della mente (a discrezione del GM). I tuoi sensi funzionano ancora, ma solo verso zone che puoi percepire senza muovere il corpo, dunque non puoi Individuare da paralizzato.",
        ],
    },
    {
        name: "Pietrificato",
        ref: "petrified",
        description: [
            "Sei stato trasformato in pietra. Non puoi agire e non puoi percepire nulla. Diventi un oggetto con Volume pari al doppio del tuo Volume normale (in genere 12 per una creatura Media pietrificata o 6 per una creatura Piccola pietrificata), CA 9, Durezza 8 e gli stessi Punti Ferita che avevi da vivo. Non hai una Soglia di Rottura. Quando ti ritrasformi in carne, hai lo stesso numero di Punti Ferita che avevi da statua. Se la statua viene distrutta, muori all'istante. Da pietrificato, la tua mente e il tuo corpo sono in stasi, quindi non invecchi e non ti accorgi del passare del tempo.",
        ],
    },
    {
        name: "Privo di Sensi",
        ref: "unconscious",
        conditionsGained: [{ ref: "prone" }],
        description: [
            "Stai dormendo o sei stato messo fuori combattimento. Non puoi agire. Subisci penalità di status -4 a CA, Percezione e TS su Riflessi, e hai le condizioni Accecato e Impreparato. Quando ottieni questa condizione, cadi Prono e lasci cadere gli oggetti che impugni o tieni a meno che l'effetto non specifichi altrimenti o il GM determini che sei in una posizione per cui ciò non accade. Se sei privo di sensi perché sei Morente, non puoi svegliarti fintanto che hai 0 Punti Ferita. Se vieni riportato a 1 Punto Ferita o più tramite la guarigione, perdi le condizioni Morente e privo di sensi e puoi agire normalmente nel tuo prossimo turno.",
            "Se sei privo di sensi e a 0 Punti Ferita, ma non morente, torni naturalmente a 1 Punto Ferita e ti svegli una volta trascorso tempo a sufficienza. Il GM determina quanto tempo resti privo di sensi, da un minimo di 10 minuti a diverse ore. Se vieni guarito durante questo periodo, perdi la condizione privo di sensi e puoi agire normalmente nel tuo prossimo turno. Se sei privo di sensi e hai più di 1 Punto Ferita (in genere perché sei addormentato o privo di sensi a causa di un effetto), ti svegli per una delle cause seguenti.",
            "Ognuna di queste cose ti fa perdere la condizione privo di sensi:",
            "- Subisci danni, ammesso che questi non ti riducano a 0 Punti Ferita (in tal caso, rimani privo di sensi e ottieni la condizione Morente come di consueto).",
            "- Vieni guarito in un modo che non sia la guarigione naturale data dal sonno.",
            "- Qualcuno ti scuote usando un'azione Interagire.",
            "- Attorno a te si verificano forti rumori; ciò però non è automatico. All'inizio del tuo turno, tenti automaticamente una prova di Percezione contro la CD del rumore (o la CD più bassa se c'e più di un rumore), e se la superi ti svegli. Se le creature cercano di restare in silenzio, questa prova di Percezione usa la loro CD di Furtività. Alcuni effetti magici ti fanno dormire cosi profondamente che non ti consentono di tentare questa prova di Percezione.",
            "Se sei soltanto addormentato, il GM decide che ti svegli perché hai riposato abbastanza o perché qualcosa ti ha disturbato.",
        ],
    },
    {
        name: "Prono",
        ref: "prone",
        conditionsGained: [{ ref: "off-guard" }],
        description: [
            "Giaci a terra. Sei Impreparato e hai penalità di circostanza -2 ai Tiri per Colpire. Le uniche azioni di movimento che puoi usare da prono sono Andare Carponi e Alzarsi. Alzarsi pone fine alla condizione prono. Puoi Andare in Copertura da prono, appiattendoti e guadagnando Copertura Superiore contro gli attacchi a distanza, anche se non hai un oggetto dietro cui ripararti: ottieni bonus di circostanza +4 alla CA contro gli attacchi a distanza, ma resti Impreparato.",
            "Se ottieni la condizione prono mentre stai Scalando o Volando, Cadi. Non puoi diventare prono mentre Nuoti.",
        ],
    },
    {
        name: "Rallentato",
        ref: "slowed",
        incremental: true,
        description: [
            "Puoi spendere meno azioni. Rallentato include sempre un valore. Quando recuperi le tue azioni all'inizio del tuo turno, riduci quel numero di azioni del valore di rallentato. Poiché rallentato ha effetto all'inizio del turno, se diventi rallentato durante il tuo turno, non perdi nessun'azione nell'immediato.",
        ],
    },
    {
        name: "Risucchiato",
        ref: "drained",
        incremental: true,
        description: [
            "Quando una creatura ti risucchia sangue o forza vitale, perdi di vigore. Risucchiato include sempre un valore. Subisci penalità di status pari al tuo valore di risucchiato alle prove basate su Costituzione, come i Tiri Salvezza su Tempra. Perdi anche un numero di Punti Ferita pari al tuo livello (minimo 1) moltiplicato per il valore di risucchiato, e i tuoi Punti Ferita massimi si riducono dello stesso ammontare. Per esempio, se vieni colpito da un effetto che infligge risucchiato 3 e sei un personaggio di 3° livello, perdi 9 Punti Ferita e riduci i tuoi Punti Ferita massimi di 9. Perdere questi Punti Ferita non conta come subire danni.",
            "A ogni tua notte piena di riposo, il tuo valore di risucchiato diminuisce di 1. Ciò aumenta i tuoi Punti Ferita massimi, ma non ti fa recuperare immediatamente i Punti Ferita perduti.",
        ],
    },
    {
        name: "Rotto",
        ref: "broken",
        objectOnly: true,
        description: [
            "Rotto è una condizione che influenza gli oggetti. Un oggetto e rotto quando il danno ha ridotto i suoi Punti Ferita a un valore pari o inferiore alla sua Soglia di Rottura. Un oggetto rotto non può essere usato per le sue normali funzioni e neppure ti concede bonus, ad eccezione delle armature. Un'armatura rotta continua a concedere i suoi bonus di oggetto alla CA, pero impone anche penalità alla CA in base alla categoria: -1 per le armature leggere rotte, -2 per le armature medie rotte e infine -3 per le armature pesanti rotte.",
            "Un oggetto rotto impone comunque penalità e limitazioni che di norma sono causate dal portarlo, tenerlo o impugnarlo. Per esempio, un'armatura rotta potrebbe comunque imporre il modificatore massimo di Destrezza, le penalità alle prove e via dicendo.",
            "Se un effetto rende un oggetto rotto in automatico e l'oggetto ha più PF della sua SR, quell'effetto riduce anche i PF attuali dell'oggetto alla sua SR.",
        ],
        //light-armor: {ac: {mod: -1}}, medium-armor: {ac: {mod: -2}}, heavy-armor: {ac: {mod: -3}}
    },
    {
        name: "Sbigottito",
        ref: "stupefied",
        incremental: true,
        description: [
            "I tuoi pensieri e istinti sono annebbiati. Sbigottito include sempre un valore. Subisci penalità di status pari a tale valore nelle prove e CD basate su Intelligenza, Saggezza e Carisma, inclusi Tiri Salvezza su Volontà, Tiri per Colpire con Incantesimo, CD di Incantesimo e prove di Abilità che utilizzano queste caratteristiche. Ogni volta che tenti di Lanciare un Incantesimo da sbigottito, l'incantesimo è interrotto a meno che non superi una Prova Semplice con CD pari a 5 + il tuo valore di sbigottito.",
        ],
    },
    {
        name: "Spaventato",
        ref: "frightened",
        incremental: true,
        description: [
            "Sei in preda alla paura e fatichi a controllare i nervi. La condizione spaventato include sempre un valore. Subisci penalità di status pari a questo valore a tutte le tue prove e CD. Se non é specificato diversamente, alla fine di ogni tuo turno il valore della condizione spaventato diminuisce di 1.",
        ],
    },
    {
        name: "Stordito",
        ref: "stunned",
        incremental: true,
        overrides: ["Slowed"],
        description: [
            "Sei quasi Privo di Sensi. Da stordito, non puoi agire.",
            "Stordito include in genere un valore, che indica quante azioni perdi in totale per lo stordimento, anche nel corso di più turni. Ogni volta che recuperi azioni (per esempio all'inizio del tuo turno), riducine il numero del tuo valore di stordito, poi riduci il tuo valore di stordito del numero di azioni perse. Per esempio, se sei stordito 4, perdi tutte e 3 le azioni nel tuo turno, cosa che ti riduce a stordito 1; nel tuo prossimo turno perdi 1 altra azione, e poi puoi usare normalmente le 2 azioni rimanenti. Stordito può anche avere una durata anziché un valore, come \"stordito per 1 minuto\", in tal caso perdi tutte le azioni per la durata indicata.",
            "Stordito prevale su Rallentato. Se la durata della condizione stordito termina mentre sei Rallentato, le azioni perse per la condizione stordito contano ai fini di quelle perse a causa di Rallentato. Dunque, se sei stordito 1 e Rallentato 2 all'inizio del tuo turno, perdi 1 azione per stordito e 1 azione per rallentato, rimanendo con 1 azione da usare in quel turno.",
        ],
    },
    {
        name: "Trattenuto",
        ref: "restrained",
        conditionsGained: [{ ref: "off-guard" }, { ref: "immobilized" }],
        overrides: ["grabbed"],
        description: [
            "Sei legato in modo da poterti a malapena muovere, oppure una creatura ti ha bloccato. Hai le condizioni Immobilizzato e Impreparato, e non puoi fare nulla che abbia i tratti attacco o maneggiare a parte Sfuggire o Forzare ciò che ti trattiene. Trattenuto prevale su Afferrato.",
        ],
    },
]

const actions = [
    {
        type: "Reaction",
        ref: "Aid",
        trigger: "An ally is about to use an action that requires a skill check or attack roll.",
        requirements: "The ally is willing to accept your aid, and you have prepared to help (see below).",
        description: [
            "You try to help your ally with a task. To use this reaction, you must first prepare to help, usually by using an action during your turn. You must explain to the GM exactly how you're trying to help, and they determine whether you can Aid your ally.",
            "When you use your Aid reaction, attempt a skill check or attack roll of a type decided by the GM. The typical DC is 20, but the GM might adjust this DC for particularly hard or easy tasks. The GM can add any relevant traits to your preparatory action or to your Aid reaction depending on the situation, or even allow you to Aid checks other than skill checks and attack rolls."
        ],
        effects: {
            critSuccess: "You grant your ally a +2 circumstance bonus to the triggering check. If you're a master with the check you attempted, the bonus is +3, and if you're legendary, it's +4.",
            success: "You grant your ally a +1 circumstance bonus to the triggering check.",
            critFailure: "Your ally takes a –1 circumstance penalty to the triggering check."
        }
    },
    {

    }
]
