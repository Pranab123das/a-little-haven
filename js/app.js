
"use strict";

/* =========================================
   A LITTLE HAVEN
   BOOK OPERATIONS & LOCKDOWN SYSTEM
========================================= */


/* -----------------------------------------
   1. CONFIGURATION
----------------------------------------- */

const HAVEN_CONFIG = {
    lockDuration: 20 * 60 * 1000,
    storageKey: "littleHavenSession",
    version: "2.0.0"
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


/* -----------------------------------------
   3. TEMPORARY READING CONTENT
----------------------------------------- */

/*
   The authentic KJV verses and personal letters
   will be added in our content-building stage.

   These are temporary messages, not Bible verses.
*/

const HAVEN_CONTENT = {
    happy: {
        verse: "Your Happy book is waiting for its scripture.",
        reference: "KJV scripture collection in preparation",
        letter: "A little happiness is waiting here for you. ♡"
    },

    sad: {
        verse: "Your Sad book is waiting for its scripture.",
        reference: "KJV scripture collection in preparation",
        letter: "You don't have to carry every difficult feeling alone. ♡"
    },

    lonely: {
        verse: "Your Lonely book is waiting for its scripture.",
        reference: "KJV scripture collection in preparation",
        letter: "Even in the quietest moments, you are loved. ♡"
    },

    anxious: {
        verse: "Your Anxious book is waiting for its scripture.",
        reference: "KJV scripture collection in preparation",
        letter: "Take a gentle breath. You can take things one moment at a time. ♡"
    },

    angry: {
        verse: "Your Angry book is waiting for its scripture.",
        reference: "KJV scripture collection in preparation",
        letter: "Your feelings deserve patience, too. ♡"
    },

    thankful: {
        verse: "Your Thankful book is waiting for its scripture.",
        reference: "KJV scripture collection in preparation",
        letter: "May your heart always find little reasons to be grateful. ♡"
    },

    unspoken: {
        verse: "Your Unspoken book is waiting for its scripture.",
        reference: "KJV scripture collection in preparation",
        letter: "Even the words you cannot say matter. ♡"
    }
};


/* -----------------------------------------
   4. DEFAULT SESSION
----------------------------------------- */

function createDefaultSession() {
    return {
        version: HAVEN_CONFIG.version,

        // Books already opened in this cycle
        openedBooks: [],

        // Individual book lockdown expiry timestamps
        cooldowns: {},

        // Global lockdown expiry timestamp
        globalUntil: 0,

        // Currently open book
        activeMood: null
    };
}


/* -----------------------------------------
   5. LOAD SAVED SESSION
----------------------------------------- */

function loadSession() {
    try {
        const saved = localStorage.getItem(
            HAVEN_CONFIG.storageKey
        );

        if (!saved) {
            return createDefaultSession();
        }

        const parsed = JSON.parse(saved);

        if (
            parsed.version !== HAVEN_CONFIG.version ||
            !Array.isArray(parsed.openedBooks) ||
            typeof parsed.cooldowns !== "object" ||
            parsed.cooldowns === null
        ) {
            return createDefaultSession();
        }

        return {
            ...createDefaultSession(),
            ...parsed
        };

    } catch (error) {
        console.error("Could not load saved session:", error);
        return createDefaultSession();
    }
}


let HAVEN_STATE = loadSession();


/* -----------------------------------------
   6. SAVE SESSION
----------------------------------------- */

function saveSession() {
    try {
        localStorage.setItem(
            HAVEN_CONFIG.storageKey,
            JSON.stringify(HAVEN_STATE)
        );
    } catch (error) {
        console.error("Could not save session:", error);
    }
}


/* -----------------------------------------
   7. FIND BOOK INFORMATION
----------------------------------------- */

function getMood(moodId) {
    return HAVEN_MOODS.find(
        mood => mood.id === moodId
    );
}


/* -----------------------------------------
   8. CHECK LOCKDOWN STATES
----------------------------------------- */

function isGlobalLocked() {
    return Date.now() < HAVEN_STATE.globalUntil;
}


function isIndividuallyLocked(moodId) {
    const expiry = HAVEN_STATE.cooldowns[moodId] || 0;

    return Date.now() < expiry;
}


function isBookLocked(moodId) {
    return (
        isGlobalLocked() ||
        isIndividuallyLocked(moodId)
    );
}


function getRemainingTime(expiry) {
    return Math.max(0, expiry - Date.now());
}


/* -----------------------------------------
   9. TIMER FORMATTING
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
   10. UPDATE BOOK APPEARANCE
----------------------------------------- */

function updateBooks() {

    const now = Date.now();

    const globalLocked = now < HAVEN_STATE.globalUntil;

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

        if (!bookItem || !bookButton || !timer) {
            return;
        }

        const individualExpiry =
            HAVEN_STATE.cooldowns[mood.id] || 0;

        const locked = globalLocked ||
            now < individualExpiry;

        let remaining = 0;

        if (globalLocked) {
            remaining = getRemainingTime(
                HAVEN_STATE.globalUntil
            );
        } else if (now < individualExpiry) {
            remaining = getRemainingTime(
                individualExpiry
            );
        }

        bookItem.classList.toggle(
            "is-locked",
            locked
        );

        bookButton.disabled = locked ||
            Boolean(HAVEN_STATE.activeMood);

        bookButton.setAttribute(
            "aria-disabled",
            String(bookButton.disabled)
        );

        timer.textContent = formatTimer(remaining);

        const timerLabel = bookItem.querySelector(
            ".timer-label"
        );

        if (timerLabel) {
            timerLabel.textContent = "LOCKDOWN TIMER";
        }

        const message = bookItem.querySelector(
            ".book-message"
        );

        if (message) {
            message.textContent = locked
                ? "Resting for a little while. Come back soon. ♡"
                : mood.message;
        }

    });

    updateLibraryStatus();
}


/* -----------------------------------------
   11. LIBRARY STATUS MESSAGE
----------------------------------------- */

function updateLibraryStatus() {

    const status = document.getElementById(
        "libraryStatusText"
    );

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
   12. OPEN A BOOK
----------------------------------------- */

function openBook(moodId) {

    if (HAVEN_STATE.activeMood) return;

    if (isGlobalLocked()) return;

    if (isIndividuallyLocked(moodId)) return;

    if (HAVEN_STATE.openedBooks.length >= 2) return;

    if (HAVEN_STATE.openedBooks.includes(moodId)) return;

    const mood = getMood(moodId);

    if (!mood) return;

    const content = HAVEN_CONTENT[moodId];

    if (!content) return;


    // Register this book in the current cycle
    HAVEN_STATE.openedBooks.push(moodId);

    // Record the active book
    HAVEN_STATE.activeMood = moodId;

    saveSession();


    // Display reading content
    document.getElementById(
        "readingMoodTitle"
    ).textContent = mood.name;

    document.getElementById(
        "verseText"
    ).textContent = content.verse;

    document.getElementById(
        "verseReference"
    ).textContent = content.reference;

    document.getElementById(
        "personalLetter"
    ).textContent = content.letter;


    // Show reading section
    const readingSection = document.getElementById(
        "readingSection"
    );

    readingSection.hidden = false;

    updateBooks();

    readingSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


/* -----------------------------------------
   13. CLOSE A BOOK
----------------------------------------- */

function closeBook() {

    if (!HAVEN_STATE.activeMood) return;

    const closedMood = HAVEN_STATE.activeMood;

    // Clear active book
    HAVEN_STATE.activeMood = null;


    // Start individual lockdown
    HAVEN_STATE.cooldowns[closedMood] =
        Date.now() + HAVEN_CONFIG.lockDuration;


    /*
       If two books have now been opened and
       the second one is closed, begin global
       lockdown for the entire library.
    */

    if (HAVEN_STATE.openedBooks.length === 2) {

        HAVEN_STATE.globalUntil =
            Date.now() + HAVEN_CONFIG.lockDuration;

        // Clear individual cooldowns.
        // Global lockdown now overrides them.
        HAVEN_STATE.cooldowns = {};

    }


    // Save everything
    saveSession();


    // Hide reading section
    const readingSection = document.getElementById(
        "readingSection"
    );

    readingSection.hidden = true;


    // Refresh book appearance
    updateBooks();


    // Return to the library
    document.getElementById(
        "library"
    ).scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


/* -----------------------------------------
   14. RESET AFTER GLOBAL LOCKDOWN
----------------------------------------- */

function resetGlobalSession() {

    HAVEN_STATE.openedBooks = [];
    HAVEN_STATE.cooldowns = {};
    HAVEN_STATE.globalUntil = 0;
    HAVEN_STATE.activeMood = null;

    saveSession();

    updateBooks();

    console.log("A Little Haven is ready for a new cycle.");
}


/* -----------------------------------------
   15. CHECK TIMERS
----------------------------------------- */

function checkTimers() {

    const now = Date.now();

    // Global lockdown has finished
    if (
        HAVEN_STATE.globalUntil > 0 &&
        now >= HAVEN_STATE.globalUntil
    ) {
        resetGlobalSession();
        return;
    }


    // Remove expired individual cooldowns
    let changed = false;

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
   16. CONNECT BOOK BUTTONS
----------------------------------------- */

function connectBookButtons() {

    const buttons = document.querySelectorAll(
        ".mood-book"
    );

    buttons.forEach(button => {

        button.addEventListener("click", () => {

            const moodId = button.dataset.mood;

            openBook(moodId);

        });

    });

}


/* -----------------------------------------
   17. CONNECT CLOSE BUTTON
----------------------------------------- */

function connectCloseButton() {

    const closeButton = document.getElementById(
        "closeBookButton"
    );

    if (!closeButton) return;

    closeButton.addEventListener(
        "click",
        closeBook
    );

}


/* -----------------------------------------
   18. RESTORE AN OPEN BOOK
----------------------------------------- */

function restoreOpenBook() {

    const moodId = HAVEN_STATE.activeMood;

    if (!moodId) return;

    const mood = getMood(moodId);
    const content = HAVEN_CONTENT[moodId];

    if (!mood || !content) {
        HAVEN_STATE.activeMood = null;
        saveSession();
        return;
    }

    document.getElementById(
        "readingMoodTitle"
    ).textContent = mood.name;

    document.getElementById(
        "verseText"
    ).textContent = content.verse;

    document.getElementById(
        "verseReference"
    ).textContent = content.reference;

    document.getElementById(
        "personalLetter"
    ).textContent = content.letter;

    document.getElementById(
        "readingSection"
    ).hidden = false;

}


/* -----------------------------------------
   19. INITIALISE WEBSITE
----------------------------------------- */

function initialiseHaven() {

    connectBookButtons();

    connectCloseButton();

    restoreOpenBook();

    updateBooks();

    // Update countdowns every second
    window.setInterval(checkTimers, 1000);

    console.log("A Little Haven is ready ♡");
    console.log("Books registered:", HAVEN_MOODS.length);
    console.log("Maximum books per cycle: 2");
    console.log("Lockdown duration: 20 minutes");

}


/* -----------------------------------------
   20. START
----------------------------------------- */

document.addEventListener(
    "DOMContentLoaded",
    initialiseHaven
);
