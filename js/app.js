/* ==========================================
   A LITTLE HAVEN
   Main Application Controller
========================================== */

"use strict";

/* Application configuration */

const HAVEN_CONFIG = {
    name: "A Little Haven",

    lockDuration: 20 * 60 * 1000,

    minimumReadingTime: 20 * 1000,

    storageKey: "littleHavenSession",

    version: "1.0.0"
};


/* Mood collection */

const HAVEN_MOODS = [
    {
        id: "happy",
        name: "Happy",
        colour: "#D8B65F"
    },
    {
        id: "sad",
        name: "Sad",
        colour: "#89947A"
    },
    {
        id: "lonely",
        name: "Lonely",
        colour: "#8EBBCB"
    },
    {
        id: "anxious",
        name: "Anxious",
        colour: "#A99AC2"
    },
    {
        id: "angry",
        name: "Angry",
        colour: "#C68F9C"
    },
    {
        id: "thankful",
        name: "Thankful",
        colour: "#C69A60"
    },
    {
        id: "unspoken",
        name: "The Unspoken",
        colour: "#B8A58A"
    }
];


/* Application state */

const HAVEN_STATE = {
    selectedMood: null,

    sessionLocked: false,

    readingOpen: false,

    selectedVerse: null,

    sessionExpiry: null
};


/* Initialise application */

document.addEventListener("DOMContentLoaded", () => {

    console.log("A Little Haven is ready ♡");

    console.log(
        "Registered moods:",
        HAVEN_MOODS.length
    );

    console.log(
        "Session duration:",
        HAVEN_CONFIG.lockDuration / 60000,
        "minutes"
    );

});


/* Future modules:
   1. Book rendering
   2. Scripture selection
   3. Personal letters
   4. Book opening animations
   5. Session lockout
   6. Reading interface
*/
