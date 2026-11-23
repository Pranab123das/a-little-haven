
"use strict";

/* =========================================
   A LITTLE HAVEN
   BOOK OPERATIONS, SCRIPTURE & LOCKDOWN
   Version 2.2.0
========================================= */


/* -----------------------------------------
   1. CONFIGURATION
----------------------------------------- */

const HAVEN_CONFIG = {
    lockDuration: 20 * 60 * 1000,
    storageKey: "littleHavenSession",
    historyKey: "littleHavenVerseHistory",
    version: "2.2.0",
    timerInterval: 1000
};


/* -----------------------------------------
   2. BOOK DEFINITIONS
----------------------------------------- */

const HAVEN_MOODS = [
    {
        id: "happy",
        name: "Happy",
        message: "Are you happy today? Shall we make that smile last a little longer? ♡"
    },
    {
        id: "sad",
        name: "Sad",
        message: "Aww, why are you sad? Come here, let me comfort you with a little verse. ♡"
    },
    {
        id: "lonely",
        name: "Lonely",
        message: "Feeling a little lonely? Let me keep you company for a while. ♡"
    },
    {
        id: "anxious",
        name: "Anxious",
        message: "Is your mind feeling restless? Take a breath. Let us find some peace. ♡"
    },
    {
        id: "angry",
        name: "Angry",
        message: "Had a difficult day? Let us put your heart at ease. ♡"
    },
    {
        id: "thankful",
        name: "Thankful",
        message: "Is your heart filled with gratitude today? Let us give thanks together. ♡"
    },
    {
        id: "unspoken",
        name: "The Unspoken",
        message: "There are things you cannot put into words? You can leave them here. I understand. ♡"
    }
];

const HAVEN_MOOD_IDS = HAVEN_MOODS.map(mood => mood.id);


/* -----------------------------------------
   3. LOAD SCRIPTURE CONTENT
----------------------------------------- */

/*
   content.js MUST be loaded before app.js.

   It provides:
   window.HAVEN_CONTENT

   Each mood contains 15 entries.
   Each entry contains:
   id
   number
   reference
   verse
   explanation
   letter
*/

const HAVEN_CONTENT = window.HAVEN_CONTENT;

if (!HAVEN_CONTENT) {
    console.error(
        "A Little Haven: content.js was not found. " +
        "Load content.js before app.js."
    );
} else {

    let invalidContent = false;

    HAVEN_MOODS.forEach(mood => {

        const entries = HAVEN_CONTENT[mood.id];

        if (!Array.isArray(entries) || entries.length !== 15) {
            console.error(
                `A Little Haven: ${mood.name} must contain exactly 15 entries.`
            );

            invalidContent = true;
            return;
        }

        const ids = entries.map(entry => entry.id);

        if (
            ids.some(id => !id) ||
            new Set(ids).size !== 15
        ) {
            console.error(
                `A Little Haven: duplicate or missing entry IDs in ${mood.name}.`
            );

            invalidContent = true;
        }

        entries.forEach(entry => {

            if (
                !entry.verse ||
                !entry.reference ||
                !entry.explanation ||
                !entry.letter
            ) {
                console.error(
                    `A Little Haven: incomplete entry in ${mood.name}.`,
                    entry
                );

                invalidContent = true;
            }

        });

    });

    if (invalidContent) {
        console.error(
            "A Little Haven: content validation failed. " +
            "Please check content.js."
        );
    }
}


/* -----------------------------------------
   4. HTML ELEMENTS
----------------------------------------- */

const HAVEN_ELEMENTS = {

    library: document.getElementById("library"),

    readingSection:
        document.getElementById("readingSection"),

    readingMoodTitle:
        document.getElementById("readingMoodTitle"),

    verseText:
        document.getElementById("verseText"),

    verseReference:
        document.getElementById("verseReference"),

    verseExplanation:
        document.getElementById("verseExplanation"),

    personalLetter:
        document.getElementById("personalLetter"),

    closeButton:
        document.getElementById("closeBookButton"),

    libraryStatus:
        document.getElementById("libraryStatusText")

};


/* -----------------------------------------
   5. DEFAULT SESSION
----------------------------------------- */

function createDefaultSession() {

    return {

        version: HAVEN_CONFIG.version,

        // Books opened during the current cycle
        openedBooks: [],

        // Individual cooldown timestamps
        cooldowns: {},

        // Global lockdown expiry
        globalUntil: 0,

        // Currently open book
        activeMood: null,

        // Exact entry currently being displayed
        activeEntryId: null

    };

}


/* -----------------------------------------
   6. STORAGE HELPERS
----------------------------------------- */

function readStoredData(key, fallback) {

    try {

        const saved = localStorage.getItem(key);

        return saved ? JSON.parse(saved) : fallback;

    } catch (error) {

        console.error(
            `A Little Haven: unable to read ${key}.`,
            error
        );

        return fallback;

    }

}


function saveSession() {

    try {

        localStorage.setItem(
            HAVEN_CONFIG.storageKey,
            JSON.stringify(HAVEN_STATE)
        );

    } catch (error) {

        console.error(
            "A Little Haven: could not save session.",
            error
        );

    }

}


function saveHistory() {

    try {

        localStorage.setItem(
            HAVEN_CONFIG.historyKey,
            JSON.stringify(HAVEN_HISTORY)
        );

    } catch (error) {

        console.error(
            "A Little Haven: could not save verse history.",
            error
        );

    }

}


/* -----------------------------------------
   7. LOAD SESSION
----------------------------------------- */

function loadSession() {

    const saved = readStoredData(
        HAVEN_CONFIG.storageKey,
        null
    );

    if (!saved || typeof saved !== "object") {
        return createDefaultSession();
    }

    const session = {
        ...createDefaultSession(),
        ...saved
    };

    session.openedBooks = Array.isArray(saved.openedBooks)
        ? [...new Set(
            saved.openedBooks.filter(id =>
                HAVEN_MOOD_IDS.includes(id)
            )
        )]
        : [];

    session.cooldowns =
        saved.cooldowns &&
        typeof saved.cooldowns === "object" &&
        !Array.isArray(saved.cooldowns)
            ? saved.cooldowns
            : {};

    session.globalUntil =
        Number(saved.globalUntil) || 0;

    /*
       If the previous version did not save an entry ID,
       we cannot safely restore its temporary content.
       Therefore, clear that outdated active reading state.
    */

    if (
        !HAVEN_MOOD_IDS.includes(session.activeMood) ||
        typeof session.activeEntryId !== "string" ||
        !session.activeEntryId
    ) {

        session.activeMood = null;
        session.activeEntryId = null;

    }

    /*
       If the global lockdown has already expired,
       start a completely new cycle.
    */

    if (
        session.globalUntil > 0 &&
        session.globalUntil <= Date.now()
    ) {

        return createDefaultSession();

    }

    return session;

}


let HAVEN_STATE = loadSession();


/* -----------------------------------------
   8. LOAD VERSE HISTORY
----------------------------------------- */

function loadHistory() {

    const saved = readStoredData(
        HAVEN_CONFIG.historyKey,
        {}
    );

    const history = {};

    HAVEN_MOODS.forEach(mood => {

        const entries = HAVEN_CONTENT
            ? HAVEN_CONTENT[mood.id]
            : [];

        const validIds = new Set(
            entries.map(entry => entry.id)
        );

        const bookHistory = saved[mood.id];

        if (
            !bookHistory ||
            typeof bookHistory !== "object"
        ) {

            history[mood.id] = {
                remaining: [],
                lastShownId: null
            };

            return;

        }

        history[mood.id] = {

            remaining: Array.isArray(bookHistory.remaining)
                ? bookHistory.remaining.filter(id =>
                    validIds.has(id)
                )
                : [],

            lastShownId:
                validIds.has(bookHistory.lastShownId)
                    ? bookHistory.lastShownId
                    : null

        };

    });

    return history;

}


let HAVEN_HISTORY = loadHistory();


/* -----------------------------------------
   9. BOOK INFORMATION
----------------------------------------- */

function getMood(moodId) {

    return HAVEN_MOODS.find(
        mood => mood.id === moodId
    );

}


function getBookEntries(moodId) {

    if (!HAVEN_CONTENT) return [];

    return HAVEN_CONTENT[moodId] || [];

}


/* -----------------------------------------
   10. LOCKDOWN CHECKS
----------------------------------------- */

function isGlobalLocked() {

    return Date.now() < HAVEN_STATE.globalUntil;

}


function isIndividuallyLocked(moodId) {

    const expiry =
        HAVEN_STATE.cooldowns[moodId] || 0;

    return Date.now() < expiry;

}


function hasAlreadyBeenOpened(moodId) {

    return HAVEN_STATE.openedBooks.includes(moodId);

}


function isBookLocked(moodId) {

    return (

        isGlobalLocked() ||

        isIndividuallyLocked(moodId) ||

        hasAlreadyBeenOpened(moodId) ||

        HAVEN_STATE.openedBooks.length >= 2

    );

}


function getRemainingTime(expiry) {

    return Math.max(
        0,
        expiry - Date.now()
    );

}


/* -----------------------------------------
   11. TIMER FORMATTING
----------------------------------------- */

function formatTimer(milliseconds) {

    const totalSeconds = Math.ceil(
        Math.max(0, milliseconds) / 1000
    );

    const minutes = Math.floor(totalSeconds / 60);

    const seconds = totalSeconds % 60;

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0")
    );

}


/* -----------------------------------------
   12. SHUFFLE FUNCTION
----------------------------------------- */

function shuffleArray(array) {

    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {

        const j = Math.floor(
            Math.random() * (i + 1)
        );

        [result[i], result[j]] = [
            result[j],
            result[i]
        ];

    }

    return result;

}


/* -----------------------------------------
   13. GET NEXT SCRIPTURE ENTRY
----------------------------------------- */

function getNextEntry(moodId) {

    const entries = getBookEntries(moodId);

    if (entries.length !== 15) {
        console.error(
            `A Little Haven: invalid entries for ${moodId}.`
        );

        return null;
    }

    const validIds = new Set(
        entries.map(entry => entry.id)
    );

    let bookHistory = HAVEN_HISTORY[moodId];

    if (!bookHistory) {

        bookHistory = {
            remaining: [],
            lastShownId: null
        };

    }

    // Remove invalid IDs from saved history.
    bookHistory.remaining =
        bookHistory.remaining.filter(id =>
            validIds.has(id)
        );

    /*
       When every entry has been shown,
       create a new shuffled collection.
    */

    if (bookHistory.remaining.length === 0) {

        let newBag = shuffleArray(
            entries.map(entry => entry.id)
        );

        /*
           Avoid an immediate repeat at the boundary
           between two shuffle cycles.
        */

        if (
            newBag.length > 1 &&
            newBag[newBag.length - 1] ===
                bookHistory.lastShownId
        ) {

            [
                newBag[0],
                newBag[newBag.length - 1]
            ] = [
                newBag[newBag.length - 1],
                newBag[0]
            ];

        }

        bookHistory.remaining = newBag;

    }

    const nextId = bookHistory.remaining.shift();

    const selectedEntry = entries.find(
        entry => entry.id === nextId
    );

    if (!selectedEntry) return null;

    bookHistory.lastShownId = selectedEntry.id;

    HAVEN_HISTORY[moodId] = bookHistory;

    saveHistory();

    return selectedEntry;

}


/* -----------------------------------------
   14. DISPLAY A SCRIPTURE ENTRY
----------------------------------------- */

function displayEntry(moodId, entry) {

    const mood = getMood(moodId);

    if (!mood || !entry) return;

    if (!HAVEN_ELEMENTS.readingSection) {
        console.error(
            "A Little Haven: #readingSection is missing."
        );

        return;
    }

    /*
       Use textContent to display the approved
       wording without interpreting it as HTML.
    */

    if (HAVEN_ELEMENTS.readingMoodTitle) {
        HAVEN_ELEMENTS.readingMoodTitle.textContent =
            mood.name;
    }

    if (HAVEN_ELEMENTS.verseText) {
        HAVEN_ELEMENTS.verseText.textContent =
            entry.verse;
    }

    if (HAVEN_ELEMENTS.verseReference) {
        HAVEN_ELEMENTS.verseReference.textContent =
            entry.reference;
    }

    if (HAVEN_ELEMENTS.verseExplanation) {
        HAVEN_ELEMENTS.verseExplanation.textContent =
            entry.explanation;
    }

    if (HAVEN_ELEMENTS.personalLetter) {
        HAVEN_ELEMENTS.personalLetter.textContent =
            entry.letter;
    }

    // Save the exact entry being read.
    HAVEN_STATE.activeMood = moodId;

    HAVEN_STATE.activeEntryId = entry.id;

    saveSession();

    HAVEN_ELEMENTS.readingSection.hidden = false;

    updateBooks();

}


/* -----------------------------------------
   15. UPDATE LIBRARY STATUS
----------------------------------------- */

function updateLibraryStatus() {

    const status = HAVEN_ELEMENTS.libraryStatus;

    if (!status) return;

    if (isGlobalLocked()) {

        status.textContent =
            "The little library is resting. Come back soon. ♡";

    } else if (HAVEN_STATE.activeMood) {

        const mood = getMood(HAVEN_STATE.activeMood);

        status.textContent =
            `${mood.name} is open. Take your time, my dear. ♡`;

    } else if (HAVEN_STATE.openedBooks.length === 1) {

        status.textContent =
            "One little book has been read. One more awaits you. ♡";

    } else if (HAVEN_STATE.openedBooks.length >= 2) {

        status.textContent =
            "Your two little books have been enjoyed. ♡";

    } else {

        status.textContent =
            "All the books are waiting for you. ♡";

    }

}


/* -----------------------------------------
   16. UPDATE BOOK APPEARANCE
----------------------------------------- */

function updateBooks() {

    const now = Date.now();

    const globalLocked =
        now < HAVEN_STATE.globalUntil;

    HAVEN_MOODS.forEach(mood => {

        const bookItem = document.querySelector(
            `.book-item[data-mood="${mood.id}"]`
        );

        const bookButton = document.querySelector(
            `.mood-book[data-mood="${mood.id}"]`
        );

        const timer = document.querySelector(
            `[data-timer="${mood.id}"]`
        );

        /*
           Support the existing HTML structure.
           The outer .book-item and inner .mood-book
           are both recognised.
        */

        if (!bookButton) return;

        const individualExpiry =
            HAVEN_STATE.cooldowns[mood.id] || 0;

        const individuallyLocked =
            now < individualExpiry;

        const alreadyOpened =
            hasAlreadyBeenOpened(mood.id);

        const anotherBookIsOpen =
            Boolean(HAVEN_STATE.activeMood);

        const cycleFinished =
            HAVEN_STATE.openedBooks.length >= 2;

        const locked =
            globalLocked ||
            individuallyLocked ||
            alreadyOpened ||
            cycleFinished;

        const disabled =
            locked || anotherBookIsOpen;

        if (bookItem) {

            bookItem.classList.toggle(
                "is-locked",
                locked
            );

            bookItem.classList.toggle(
                "is-open",
                HAVEN_STATE.activeMood === mood.id
            );

        }

        bookButton.disabled = disabled;

        bookButton.setAttribute(
            "aria-disabled",
            String(disabled)
        );

        // Determine the correct timer.
        let remaining = 0;

        if (globalLocked) {

            remaining = getRemainingTime(
                HAVEN_STATE.globalUntil
            );

        } else if (individuallyLocked) {

            remaining = getRemainingTime(
                individualExpiry
            );

        }

        if (timer) {

            if (globalLocked || individuallyLocked) {

                timer.textContent =
                    formatTimer(remaining);

            } else if (alreadyOpened) {

                timer.textContent =
                    "USED THIS CYCLE";

            } else {

                timer.textContent = "";

            }

        }

        // Update optional timer label.
        const timerLabel = bookItem
            ? bookItem.querySelector(".timer-label")
            : null;

        if (timerLabel) {

            timerLabel.textContent =
                globalLocked || individuallyLocked
                    ? "LOCKDOWN TIMER"
                    : alreadyOpened
                        ? "BOOK STATUS"
                        : "";

        }

        // Update the existing book message.
        const message = bookItem
            ? bookItem.querySelector(".book-message")
            : null;

        if (message) {

            if (globalLocked) {

                message.textContent =
                    "The little library is resting. Come back soon. ♡";

            } else if (alreadyOpened) {

                message.textContent =
                    "This little book has already been opened this cycle. ♡";

            } else if (individuallyLocked) {

                message.textContent =
                    "Resting for a little while. Come back soon. ♡";

            } else {

                message.textContent = mood.message;

            }

        }

    });

    updateLibraryStatus();

}


/* -----------------------------------------
   17. OPEN A BOOK
----------------------------------------- */

function openBook(moodId) {

    if (!HAVEN_CONTENT) return;

    // Do not allow another book while one is open.
    if (HAVEN_STATE.activeMood) return;

    // Global lockdown.
    if (isGlobalLocked()) return;

    // Individual cooldown.
    if (isIndividuallyLocked(moodId)) return;

    // Maximum two books per cycle.
    if (HAVEN_STATE.openedBooks.length >= 2) return;

    // Each book can be opened only once per cycle.
    if (hasAlreadyBeenOpened(moodId)) return;

    const mood = getMood(moodId);

    if (!mood) return;

    const entry = getNextEntry(moodId);

    if (!entry) return;

    /*
       Register the book before displaying it.
       The selected entry is already recorded
       in the shuffle history.
    */

    HAVEN_STATE.openedBooks.push(moodId);

    HAVEN_STATE.activeMood = moodId;

    HAVEN_STATE.activeEntryId = entry.id;

    saveSession();

    displayEntry(moodId, entry);

    updateBooks();

    HAVEN_ELEMENTS.readingSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


/* -----------------------------------------
   18. CLOSE A BOOK
----------------------------------------- */

function closeBook() {

    if (!HAVEN_STATE.activeMood) return;

    const closedMood = HAVEN_STATE.activeMood;

    // Clear the active reading state.
    HAVEN_STATE.activeMood = null;

    HAVEN_STATE.activeEntryId = null;

    /*
       Start individual 20-minute cooldown
       when the book is closed.
    */

    HAVEN_STATE.cooldowns[closedMood] =
        Date.now() + HAVEN_CONFIG.lockDuration;

    /*
       After the second book is closed,
       lock the entire library for 20 minutes.
    */

    if (HAVEN_STATE.openedBooks.length === 2) {

        HAVEN_STATE.globalUntil =
            Date.now() + HAVEN_CONFIG.lockDuration;

        // Global lockdown replaces individual cooldowns.
        HAVEN_STATE.cooldowns = {};

    }
   saveSession();

    // Hide the reading section.
    if (HAVEN_ELEMENTS.readingSection) {

        HAVEN_ELEMENTS.readingSection.hidden = true;

    }

    updateBooks();

    // Return to the library.
    if (HAVEN_ELEMENTS.library) {

        HAVEN_ELEMENTS.library.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

}


/* -----------------------------------------
   19. RESET GLOBAL SESSION
----------------------------------------- */

function resetGlobalSession() {

    HAVEN_STATE.openedBooks = [];

    HAVEN_STATE.cooldowns = {};

    HAVEN_STATE.globalUntil = 0;

    HAVEN_STATE.activeMood = null;

    HAVEN_STATE.activeEntryId = null;
   saveSession();

    updateBooks();

    console.log(
        "A Little Haven: a new reading cycle has begun. ♡"
    );

}


/* -----------------------------------------
   20. CHECK TIMERS
----------------------------------------- */

function checkTimers() {

    const now = Date.now();

    /*
       When global lockdown expires,
       reset all book access restrictions.
    */

    if (
        HAVEN_STATE.globalUntil > 0 &&
        now >= HAVEN_STATE.globalUntil
    ) {

        resetGlobalSession();

        return;

    }

    let changed = false;
   /*
       Remove expired individual cooldowns.
       The book remains unavailable for the
       rest of this cycle because it has already
       been opened once.
    */

    Object.keys(HAVEN_STATE.cooldowns).forEach(moodId => {

        if (now >= HAVEN_STATE.cooldowns[moodId]) {

            delete HAVEN_STATE.cooldowns[moodId];

            changed = true;

        }

    });

    if (changed) {
        saveSession();
    }

    updateBooks();

}


/* -----------------------------------------
   21. RESTORE OPEN BOOK AFTER REFRESH
----------------------------------------- */

function restoreOpenBook() {

    const moodId = HAVEN_STATE.activeMood;

    const entryId = HAVEN_STATE.activeEntryId;

    if (!moodId || !entryId) return;
   const mood = getMood(moodId);

    const entries = getBookEntries(moodId);

    const entry = entries.find(
        item => item.id === entryId
    );

    if (!mood || !entry) {

        console.error(
            "A Little Haven: saved reading entry could not be restored."
        );

        HAVEN_STATE.activeMood = null;

        HAVEN_STATE.activeEntryId = null;

        saveSession();

        return;

    }

    /*
       Restore the exact same entry.
       Do not select another random verse.
    */

    displayEntry(moodId, entry);

}
/* -----------------------------------------
   22. CONNECT BOOK BUTTONS
----------------------------------------- */

function connectBookButtons() {

    const buttons = document.querySelectorAll(
        ".mood-book[data-mood]"
    );

    buttons.forEach(button => {

        button.addEventListener("click", () => {

            const moodId = button.dataset.mood;

            openBook(moodId);

        });

    });

}


/* -----------------------------------------
   23. CONNECT CLOSE BUTTON
----------------------------------------- */

function connectCloseButton() {

    const closeButton = HAVEN_ELEMENTS.closeButton;

    if (!closeButton) {

        console.warn(
            "A Little Haven: #closeBookButton was not found."
        );

        return;

    }
   closeButton.addEventListener(
        "click",
        closeBook
    );

}


/* -----------------------------------------
   24. INITIALISE WEBSITE
----------------------------------------- */

function initialiseHaven() {

    if (!HAVEN_CONTENT) {

        console.error(
            "A Little Haven could not start because content.js is missing."
        );

        return;

    }

    connectBookButtons();

    connectCloseButton();

    restoreOpenBook();

    updateBooks();

    // Refresh countdowns once every second.
    window.setInterval(
        checkTimers,
        HAVEN_CONFIG.timerInterval
    );

    console.log("A Little Haven is ready. ♡");
   console.log(
        "Registered books:",
        HAVEN_MOODS.length
    );

    console.log(
        "Entries per book:",
        15
    );

    console.log(
        "Maximum books per cycle:",
        2
    );

    console.log(
        "Lockdown duration:",
        "20 minutes"
    );

}


/* -----------------------------------------
   25. START APPLICATION
----------------------------------------- */

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initialiseHaven
    );

} else {

    initialiseHaven();

}
/* -----------------------------------------
   26. OPTIONAL DEBUGGING ACCESS
----------------------------------------- */

window.HAVEN_APP = {

    openBook,

    closeBook,

    updateBooks,

    checkTimers,

    getState() {
        return JSON.parse(
            JSON.stringify(HAVEN_STATE)
        );
    },

    getHistory() {
        return JSON.parse(
            JSON.stringify(HAVEN_HISTORY)
        );
    }

};
