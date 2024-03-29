import Vex from 'vexflow';
import Note from './Note';

const VF = Vex.Flow;

export default class Voice {
    static get DEFAULT() {
        return {
            PENDING: true,
            SAVED_NOTES: 0,
            JOIN: true,
            MODE: VF.Voice.Mode.SOFT,
            GROUPS: [
                {
                    numerator: 4,
                    denominator: 8
                }
            ]
        }
    }
    constructor(notes, stem, time) {
        this.time = time;
        this.model = {
            pending: Voice.DEFAULT.PENDING,
            savedNotes: Voice.DEFAULT.SAVED_NOTES,
            join: Voice.DEFAULT.JOIN,
            mode: Voice.DEFAULT.MODE,
            tickables: notes,
            beams: {
                direction: stem,
                groups: Voice.DEFAULT.GROUPS
            }
        }
    }

    getVFVoice(vfStave) {
        this.createTies();
        this.vfVoice = new VF.Voice(this.time).setMode(this.mode);
        this.vfVoice.setStave(vfStave);

        if (this.tickables && this.tickables.length) { 
            var vfTickables = this.tickables.map(note => {
                return note.getVFNote(vfStave);
            });

            this.vfVoice.addTickables(vfTickables);
        }

        return this.vfVoice;
    }

    getVFBeams() {
        let groups = this.beams.groups.map(fraction => {
            return new VF.Fraction(fraction.numerator, fraction.denominator);
        });

        this.vfBeams = VF.Beam.applyAndGetBeams(this.vfVoice, this.beams.direction, groups);

        return this.vfBeams;
    }

    getVFTies() {
        if (!this.vfVoice) {
            this.getVFVoice();
        }

        this.vfTies = this.ties.map(tie => {
            return new VF.StaveTie({
                first_note: this.vfTickablesList[tie.first_note],
                last_note: this.vfTickablesList[tie.last_note],
                first_indices: tie.first_indices,
                last_indices: tie.last_indices
            });
        })

        return this.vfTies;
    }


    addNote(note) {
        this.tickables = this.tickables.slice(0, this.savedNotes);
        note.currentStyle = Note.DEFAULT.STYLE;

        if (note) {
            this.tickables.push(note);
            if (this.full().overFull) {
                this.tickables.pop();
                note.currentStyle = {
                    fillStyle: "red",
                    strokeStyle: "red"
                }
                this.tickables.push(note);
            }
        }
    }

    deleteNote() {
        if (this.savedNotes > 0) {
            this.pending = true;
            this.savedNotes--;
            this.tickables.pop();
        }
    }

    full() {
        let numBeats = this.time.num_beats;
        let beatValue = this.time.beat_value;

        var sum = 0.0;
        this.tickables.forEach(note => {
            sum += 1/note.doubleDuration;
        });

        sum = parseInt(Number.parseFloat(sum).toPrecision(4));

        let exact = sum === (numBeats / beatValue);
        let overFull = sum > (numBeats / beatValue);

        return {
            exact: exact,
            overFull: overFull
        }
    }

    /**
     * Determines whether a note is already pending in this voice.
     * @param {*} note 
     */
    isNewNote(note) {
        if (this.pending) {
            for(let i = 0, tickable; tickable = this.tickables[i]; i++) {
                if (i >= this.savedNotes && Note.compare(note, tickable)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Creates the ties for the stave so that 
     * note values are spread correctly accross beats
     */
    createTies() {
        if (!this.pending) {
            //console.log(this.full());

            let numBeats = this.time.num_beats;
            let beatValue = this.time.beat_value;
            
            let currentBeatLocation = 0.0;
            let beatNum = 0;
            let i = 0;
            while (beatNum < numBeats && i < this.tickables.length) {
                let note = this.tickables[i];
                let noteBeatDuration = beatValue / note.doubleDuration;

                if (parseInt(currentBeatLocation + noteBeatDuration) > beatNum) {
                    beatNum++;
                    let secondSectionBeats = currentBeatLocation + noteBeatDuration - beatNum;
                    let firstSectionBeats = noteBeatDuration - secondSectionBeats;

                    if (secondSectionBeats) {
                        this.tickables.splice(i, 1);

                        // If there's anything in the second section
                        let notes = []
                        while (noteBeatDuration > 0) {
                            noteBeatDuration -= firstSectionBeats;

                            notes.push(new Note({
                                clef: note.clef,
                                keys: note.keys,
                                duration: parseInt(beatValue / firstSectionBeats) + ""
                            }));

                            beatNum++;
                            if (secondSectionBeats > 1) {
                                firstSectionBeats = 1;
                                secondSectionBeats -= 1;
                            } else {
                                firstSectionBeats = secondSectionBeats;
                            }
                        }

                        // Splice in notes to the tickables array
                        notes.reverse().forEach(note => {
                            this.tickables.splice(i, 0, note);
                        })
                    }
                }

                currentBeatLocation += noteBeatDuration;
                i++;
            }
            this.saveNotes = this.tickables.length;
        }
    }

    /**
     * @returns {Array}
     */
    get tickables() {
        return this.model.tickables;
    }

    get savedNotes() {
        return this.model.savedNotes;
    }

    get pending() {
        return this.model.pending;
    }

    get mode() {
        return this.model.mode;
    }

    get beams() {
        return this.model.beams;
    }

    get vfTickablesList() {
        return this.vfVoice.getTickables();
    }

    get savedNotes() {
        return this.model.savedNotes;
    }

    get join() {
        return this.model.join;
    }

    get currentStyle() {
        return this.model.currentStyle;
    }

    set currentStyle(currentStyle) {
        this.model.currentStyle = currentStyle;
    }
    
    set savedNotes(savedNotes) {
        this.model.savedNotes = savedNotes;
    }

    set pending(pending) {
        this.model.pending = pending;
    }

    set tickables(tickables) {
        this.model.tickables = tickables;
    }
}