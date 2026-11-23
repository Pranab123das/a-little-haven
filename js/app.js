
"use strict";

/* =========================================
   A LITTLE HAVEN
   BOOK OPERATIONS, SCRIPTURE & LOCKDOWN
   Version 2.3.0
========================================= */


/* -----------------------------------------
   1. CONFIGURATION
----------------------------------------- */

const HAVEN_CONFIG = {
    lockDuration: 20 * 60 * 1000,
    storageKey: "littleHavenSession",
    historyKey: "littleHavenVerseHistory",
    version: "2.3.0",
    timerInterval: 1000,
    entriesPerBook: 15,
    maximumBooksPerCycle: 2
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
   3. LOAD AND VALIDATE CONTENT
----------------------------------------- */

/*
   content.js MUST load before app.js.

   It provides:
   window.HAVEN_CONTENT

   Each mood must contain exactly 15 entries.

   Each entry must contain:
   id
   number
   reference
   verse
   explanation
   letter

   The verse, explanation and letter always
   remain together as one entry.
*/

const HAVEN_CONTENT = window.HAVEN_CONTENT;

function validateContent() {

    if (
        !HAVEN_CONTENT ||
        typeof HAVEN_CONTENT !== "object" ||
        Array.isArray(HAVEN_CONTENT)
    ) {
        console.error(
            "A Little Haven: content.js is missing or invalid."
        );

        return false;
    }

    let valid = true;

    HAVEN_MOODS.forEach(mood => {

        const entries = HAVEN_CONTENT[mood.id];

        if (
            !Array.isArray(entries) ||
            entries.length !== HAVEN_CONFIG.entriesPerBook
        ) {
            console.error(
                `A Little Haven: ${mood.name} must contain exactly ${HAVEN_CONFIG.entriesPerBook} entries.`
            );

            valid = false;
            return;
        }

        const ids = entries.map(entry => entry?.id);

        if (
            ids.some(id =>
                typeof id !== "string" || !id.trim()
            ) ||
            new Set(ids).size !== HAVEN_CONFIG.entriesPerBook
        ) {
            console.error(
                `A Little Haven: ${mood.name} contains missing or duplicate entry IDs.`
            );

            valid = false;
        }

        entries.forEach((entry, index) => {

            const requiredFields = [
                "verse",
                "reference",
                "explanation",
                "letter"
            ];

            const missingFields = requiredFields.filter(field =>
                typeof entry?.[field] !== "string" ||
                !entry[field].trim()
            );

            if (missingFields.length > 0) {

                console.error(
                    `A Little Haven: incomplete entry ${index + 1} in ${mood.name}. Missing: ${missingFields.join(", ")}.`,
                    entry
                );

                valid = false;
            }

        });

    });

    return valid;

}

const HAVEN_CONTENT_VALID = validateContent();


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

        // Books opened during this cycle.
        openedBooks: [],

        // Individual cooldown expiry timestamps.
        cooldowns: {},

        // Global lockdown expiry timestamp.
        globalUntil: 0,

        // Currently open book.
        activeMood: null,

        // Exact entry currently displayed.
        activeEntryId: null
    };

}


/* -----------------------------------------
   6. STORAGE HELPERS
----------------------------------------- */

function readStoredData(key, fallback) {

    try {

        const saved = localStorage.getItem(key);

        if (saved === null) {
            return fallback;
        }

        return JSON.parse(saved);

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
            "A Little Haven: could not save the session.",
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


function isValidTimestamp(value) {

    return (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0
    );

}


/* -----------------------------------------
   7. LOAD AND VALIDATE SESSION
----------------------------------------- */

function loadSession() {

    const saved = readStoredData(
        HAVEN_CONFIG.storageKey,
        null
    );

    if (
        !saved ||
        typeof saved !== "object" ||
        Array.isArray(saved)
    ) {
        return createDefaultSession();
    }

    /*
       Do not reuse sessions created by an
       incompatible application version.
       Verse history is stored separately and
       will therefore remain untouched.
    */

    if (saved.version !== HAVEN_CONFIG.version) {

        console.info(
            "A Little Haven: starting a fresh session for the new version."
        );

        return createDefaultSession();

    }

    const session = createDefaultSession();

    // Validate opened books.
    if (Array.isArray(saved.openedBooks)) {

        session.openedBooks = [
            ...new Set(
                saved.openedBooks.filter(id =>
                    HAVEN_MOOD_IDS.includes(id)
                )
            )
        ].slice(0, HAVEN_CONFIG.maximumBooksPerCycle);

    }

    // Validate cooldown data.
    if (
        saved.cooldowns &&
        typeof saved.cooldowns === "object" &&
        !Array.isArray(saved.cooldowns)
    ) {

        Object.entries(saved.cooldowns).forEach(([moodId, expiry]) => {

            if (
                HAVEN_MOOD_IDS.includes(moodId) &&
                isValidTimestamp(expiry) &&
                expiry > Date.now()
            ) {
                session.cooldowns[moodId] = expiry;
            }

        });

    }

    // Validate global lockdown.
    if (isValidTimestamp(saved.globalUntil)) {
        session.globalUntil = saved.globalUntil;
    }

    // Restore active reading only when it is valid.
    const activeMoodIsValid =
        HAVEN_MOOD_IDS.includes(saved.activeMood);

    const activeEntryIdIsValid =
        typeof saved.activeEntryId === "string" &&
        saved.activeEntryId.trim().length > 0;

    const activeBookWasOpened =
        session.openedBooks.includes(saved.activeMood);

    if (
        activeMoodIsValid &&
        activeEntryIdIsValid &&
        activeBookWasOpened
    ) {

        session.activeMood = saved.activeMood;
        session.activeEntryId = saved.activeEntryId;

    }

    /*
       If the saved global lockdown has expired,
       reset the entire cycle.
    */

    if (
        session.globalUntil > 0 &&
        session.globalUntil <= Date.now()
    ) {
        return createDefaultSession();
    }

    /*
       A global lockdown and active reading
       cannot exist at the same time.
    */

    if (session.globalUntil > 0) {

        session.activeMood = null;
        session.activeEntryId = null;
        session.cooldowns = {};

    }

    return session;

}


let HAVEN_STATE = loadSession();


/* -----------------------------------------
   8. LOAD AND VALIDATE VERSE HISTORY
----------------------------------------- */

function loadHistory() {

    const saved = readStoredData(
        HAVEN_CONFIG.historyKey,
        {}
    );

    const history = {};

    HAVEN_MOODS.forEach(mood => {

        const entries = HAVEN_CONTENT_VALID
            ? HAVEN_CONTENT[mood.id]
            : [];

        const validIds = new Set(
            entries.map(entry => entry.id)
        );

        const bookHistory =
            saved &&
            typeof saved === "object" &&
            !Array.isArray(saved)
                ? saved[mood.id]
                : null;

        if (
            !bookHistory ||
            typeof bookHistory !== "object" ||
            Array.isArray(bookHistory)
        ) {

            history[mood.id] = {
                remaining: [],
                lastShownId: null
            };

            return;

        }

        const remaining = Array.isArray(bookHistory.remaining)
            ? [
                ...new Set(
                    bookHistory.remaining.filter(id =>
                        validIds.has(id)
                    )
                )
            ]
            : [];

        const lastShownId =
            validIds.has(bookHistory.lastShownId)
                ? bookHistory.lastShownId
                : null;

        history[mood.id] = {
            remaining,
            lastShownId
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
    ) || null;

}


function getBookEntries(moodId) {

    if (!HAVEN_CONTENT_VALID) {
        return [];
    }

    return Array.isArray(HAVEN_CONTENT[moodId])
        ? HAVEN_CONTENT[moodId]
        : [];

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
        HAVEN_STATE.openedBooks.length >=
            HAVEN_CONFIG.maximumBooksPerCycle
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

    if (entries.length !== HAVEN_CONFIG.entriesPerBook) {

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

    // Remove invalid and duplicate saved IDs.
    bookHistory.remaining = [
        ...new Set(
            bookHistory.remaining.filter(id =>
                validIds.has(id)
            )
        )
    ];

    /*
       When every entry has been shown,
       create a new shuffled collection.
    */

    if (bookHistory.remaining.length === 0) {

        const newBag = shuffleArray(
            entries.map(entry => entry.id)
        );

        /*
           Prevent an immediate repeat between
           the end of one shuffle cycle and
           the beginning of the next.
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

    if (!selectedEntry) {

        console.error(
            `A Little Haven: could not find entry ${nextId}.`
        );

        return null;

    }

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

    if (!mood || !entry) {
        return false;
    }

    if (!HAVEN_ELEMENTS.readingSection) {

        console.error(
            "A Little Haven: #readingSection is missing."
        );

        return false;

    }

    /*
       textContent preserves the approved text
       without interpreting it as HTML.
    */

    HAVEN_ELEMENTS.readingMoodTitle.textContent =
        mood.name;

    HAVEN_ELEMENTS.verseText.textContent =
        entry.verse;

    HAVEN_ELEMENTS.verseReference.textContent =
        entry.reference;

    HAVEN_ELEMENTS.verseExplanation.textContent =
        entry.explanation;

    HAVEN_ELEMENTS.personalLetter.textContent =
        entry.letter;

    // Save the exact entry being displayed.
    HAVEN_STATE.activeMood = moodId;

    HAVEN_STATE.activeEntryId = entry.id;

    saveSession();

    HAVEN_ELEMENTS.readingSection.hidden = false;

    updateBooks();

    return true;

}


/* -----------------------------------------
   15. UPDATE LIBRARY STATUS
----------------------------------------- */

function updateLibraryStatus() {

    const status = HAVEN_ELEMENTS.libraryStatus;

    if (!status) {
        return;
    }

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

    } else if (
        HAVEN_STATE.openedBooks.length >=
        HAVEN_CONFIG.maximumBooksPerCycle
    ) {

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

        if (!bookButton) {
            return;
        }

        const individualExpiry =
            HAVEN_STATE.cooldowns[mood.id] || 0;

        const individuallyLocked =
            now < individualExpiry;

        const alreadyOpened =
            hasAlreadyBeenOpened(mood.id);

        const isActive =
            HAVEN_STATE.activeMood === mood.id;

        const anotherBookIsOpen =
            Boolean(HAVEN_STATE.activeMood) &&
            !isActive;

        const cycleFinished =
            HAVEN_STATE.openedBooks.length >=
            HAVEN_CONFIG.maximumBooksPerCycle;

        const locked =
            globalLocked ||
            individuallyLocked ||
            alreadyOpened ||
            cycleFinished;

        /*
           The active book is not visually blurred.
           It remains disabled to prevent a second
           click while its reading page is open.
        */

        const visuallyLocked =
            locked && !isActive;

        const disabled =
            locked || anotherBookIsOpen;

        if (bookItem) {

            bookItem.classList.toggle(
                "is-locked",
                visuallyLocked
            );

            bookItem.classList.toggle(
                "is-open",
                isActive
            );

        }

        bookButton.disabled = disabled;

        bookButton.setAttribute(
            "aria-disabled",
            String(disabled)
        );

        // Determine the timer to display.
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

            } else if (isActive) {

                timer.textContent =
                    "NOW READING";

            } else if (alreadyOpened) {

                timer.textContent =
                    "USED THIS CYCLE";

            } else {

                timer.textContent = "";

            }

        }

        // Update timer label.
        const timerLabel = bookItem
            ? bookItem.querySelector(".timer-label")
            : null;

        if (timerLabel) {

            timerLabel.textContent =
                globalLocked || individuallyLocked
                    ? "LOCKDOWN TIMER"
                    : isActive
                        ? "CURRENTLY OPEN"
                        : alreadyOpened
                            ? "BOOK STATUS"
                            : "";
           }

        // Update the existing book message.
        const message = bookItem
            ? bookItem.querySelector(".book-message")
            : null;

        if (message) {

            if (isActive) {

                message.textContent =
                    "Your little book is open. Take all the time you need. ♡";

            } else if (globalLocked) {

                message.textContent =
                    "The little library is resting. Come back soon. ♡";

            } else if (individuallyLocked) {

                message.textContent =
                    "Resting for a little while. Come back soon. ♡";

            } else if (alreadyOpened) {

                message.textContent =
                    "This little book has already been opened this cycle. ♡";

            } else {

                message.textContent = mood.message;

            }

        }

    });updateLibraryStatus();

}


/* -----------------------------------------
   17. OPEN A BOOK
----------------------------------------- */

function openBook(moodId) {

    if (!HAVEN_CONTENT_VALID) {
        console.error(
            "A Little Haven: cannot open a book because content validation failed."
        );

        return;
    }

    // Do not open another book while one is active.
    if (HAVEN_STATE.activeMood) {
        return;
    }

    // Global lockdown.
    if (isGlobalLocked()) {
        return;
    }

    // Validate the requested mood.
    const mood = getMood(moodId);

    if (!mood) {
        return;
    }

    // Individual cooldown.
    if (isIndividuallyLocked(moodId)) {
        return;
    }
   // Maximum two books per cycle.
    if (
        HAVEN_STATE.openedBooks.length >=
        HAVEN_CONFIG.maximumBooksPerCycle
    ) {
        return;
    }

    // Each book can be opened only once per cycle.
    if (hasAlreadyBeenOpened(moodId)) {
        return;
    }

    const entry = getNextEntry(moodId);

    if (!entry) {
        return;
    }

    /*
       Register the book and selected entry.
       The history is saved independently.
    */

    HAVEN_STATE.openedBooks.push(moodId);

    HAVEN_STATE.activeMood = moodId;

    HAVEN_STATE.activeEntryId = entry.id;

    saveSession();

    if (!displayEntry(moodId, entry)) {
        return;
    }

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

    if (!HAVEN_STATE.activeMood) {
        return;
    }

    const closedMood = HAVEN_STATE.activeMood;

    // Clear active reading state.
    HAVEN_STATE.activeMood = null;

    HAVEN_STATE.activeEntryId = null;

    /*
       Start an individual 20-minute cooldown
       when the book is closed.
    */

    HAVEN_STATE.cooldowns[closedMood] =
        Date.now() + HAVEN_CONFIG.lockDuration;

    /*
       After the second book is closed,
       lock the entire library for 20 minutes.
    */

    if (
        HAVEN_STATE.openedBooks.length ===
        HAVEN_CONFIG.maximumBooksPerCycle
    ) {

        HAVEN_STATE.globalUntil =
            Date.now() + HAVEN_CONFIG.lockDuration;

        // Global lockdown replaces individual timers.
        HAVEN_STATE.cooldowns = {};

    }
   saveSession();

    // Hide the reading section.
    HAVEN_ELEMENTS.readingSection.hidden = true;

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

    HAVEN_STATE = createDefaultSession();

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
       Verse history is deliberately preserved.
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
       A book remains unavailable for the rest
       of this cycle because it has already
       been opened once.
    */
   Object.keys(HAVEN_STATE.cooldowns).forEach(moodId => {

        if (
            now >= HAVEN_STATE.cooldowns[moodId]
        ) {

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

    if (!moodId || !entryId) {
        return;
    }
   const mood = getMood(moodId);

    const entries = getBookEntries(moodId);

    const entry = entries.find(
        item => item.id === entryId
    );

    if (!mood || !entry) {

        console.error(
            "A Little Haven: saved reading entry could not be restored."
        );

        /*
           Preserve the fact that the book was
           already opened during this cycle.
           Only clear the invalid active reading.
        */

        HAVEN_STATE.activeMood = null;

        HAVEN_STATE.activeEntryId = null;

        saveSession();

        return;

    }

    /*
       Restore the exact same entry.
       Never select another random verse here.
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
   24. CHECK REQUIRED HTML ELEMENTS
----------------------------------------- */

function validateHTML() {

    const requiredElements = [
        "readingSection",
        "readingMoodTitle",
        "verseText",
        "verseReference",
        "verseExplanation",
        "personalLetter",
        "closeButton"
    ];

    const missing = requiredElements.filter(key =>
        !HAVEN_ELEMENTS[key]
    );

    if (missing.length > 0) {

        console.error(
            "A Little Haven: required HTML elements are missing:",
            missing
        );

        return false;

    }
   const missingBooks = HAVEN_MOODS.filter(mood =>
        !document.querySelector(
            `.mood-book[data-mood="${mood.id}"]`
        )
    );

    if (missingBooks.length > 0) {

        console.error(
            "A Little Haven: book buttons are missing:",
            missingBooks.map(mood => mood.id)
        );

        return false;

    }

    return true;

}
/* -----------------------------------------
   25. INITIALISE WEBSITE
----------------------------------------- */

function initialiseHaven() {

    if (!HAVEN_CONTENT_VALID) {

        console.error(
            "A Little Haven could not start because content validation failed."
        );

        return;

    }

    if (!validateHTML()) {

        console.error(
            "A Little Haven could not start because required HTML elements are missing."
        );

        return;

    }

    connectBookButtons();

    connectCloseButton();

    // Restore the exact entry if one was open.
    restoreOpenBook();

    // Draw the correct book states and timers.
    updateBooks();

    // Update countdowns once every second.
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
        HAVEN_CONFIG.entriesPerBook
    );

    console.log(
        "Maximum books per cycle:",
        HAVEN_CONFIG.maximumBooksPerCycle
    );

    console.log(
        "Individual and global cooldown:",
        "20 minutes"
    );

}
/* -----------------------------------------
   26. START APPLICATION
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
   27. OPTIONAL DEBUGGING ACCESS
----------------------------------------- */

window.HAVEN_APP = {

    openBook,

    closeBook,

    updateBooks,

    checkTimers,

    resetGlobalSession,

    getState() {

        return JSON.parse(
            JSON.stringify(HAVEN_STATE)
        );

    },
   getHistory() {

        return JSON.parse(
            JSON.stringify(HAVEN_HISTORY)
        );

    },

    validateContent() {

        return HAVEN_CONTENT_VALID;

    }

};




   
