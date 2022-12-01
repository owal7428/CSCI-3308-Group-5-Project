//Script code goes here
const CALENDAR_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
let maxDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; //Can be changed if the current year is a leap year

let globalDate; //Stores what date the user is currently looking at (always a sunday for normalization)
let globalMonth; //Stores what month the user is currently looking at
let globalYear; //Stores what year the user is currently looking at
let week; //Stores the offset of weeks that the user is currently on (0 means the week of the current date)
let currentDate; //Stores the current date in reality. Used to highlight the current date on the calendar

function initialize_calendar() { //Called at page load or when the user wants to return to the current date

    if(!document.getElementById('calendar')) { //Checks if this is indeed the profile page (this function is called on every body load)
        return;
    }

    let today = new Date();
    currentDate = today.getDate();
    today.setDate(today.getDate() - today.getDay()); //Normalizes the date so that the globalDate is always stored as a sunday
    globalDate = today.getDate();
    globalMonth = today.getMonth() + 1; //Months are stored as 0-11 so 1 has to be added to get the correct date format
    globalYear = today.getFullYear();
    checkLeapYear();
    week = 0; //Because this is calling the current date, the week offset is 0

    change_calendar(); //Will cause the default case in the switch statement so no variables are manipulated before building the calendar
}


function change_calendar(operation) {
    const calendar_element = document.getElementById('calendar');
    calendar_element.innerHTML = ''; //Clears the current calendar on the page so it can be rebuilt in the new week



    switch(operation) {
        case 'previousMonth':
            if(globalMonth === 1) { //Checks for wraparound months
                globalMonth = 12;
                globalYear--;
                checkLeapYear();
            }
            else {
                globalMonth--;
            }
            if(globalDate >= 28) { //In some cases subtracting 4 weeks will still land a user in the same month so an extra week needs to be subtracted
                globalDate = globalDate - 35 + maxDays[globalMonth - 1];
                week -= 5;
            }
            else {
                globalDate = globalDate - 28 + maxDays[globalMonth - 1];
                week -= 4;
            }
            while(globalDate > 7) { //Normalizes the date so that the first full week of the month is being shown
                globalDate -= 7;
                week--;
            }
            break;
        case 'previousWeek':
            globalDate -= 7;
            week --;
            if(globalDate < 1) { //Checks if going back a week results in going back a month
                if(globalMonth === 1) {
                    globalMonth = 12;
                    globalYear--;
                    checkLeapYear();
                }
                else {
                    globalMonth--;
                }
                globalDate += maxDays[globalMonth - 1];
            }
            break;
        case 'currentDay' :
            initialize_calendar(); //Will reset the date and clear the calendar
            return;
        case 'nextWeek':
            globalDate += 7;
            week++;
            if(globalDate > maxDays[globalMonth - 1]) {
                globalDate -= maxDays[globalMonth - 1];
                if(globalMonth === 12) {
                    globalMonth = 1;
                    globalYear++;
                    checkLeapYear();
                }
                else {
                    globalMonth++;
                }
            }
            break;
        case 'nextMonth':
            if(globalDate < 4) { //In some cases adding 4 weeks will still land the user in the same month so an extra week needs to be added
                globalDate = globalDate + 35 - maxDays[globalMonth - 1];
                week += 5;
            }
            else {
                globalDate = globalDate + 28 - maxDays[globalMonth - 1];
                week += 4;
            }
            if(globalMonth === 12) {
                globalMonth = 1;
                globalYear++;
                checkLeapYear();
            }
            else {
                globalMonth++;
            }
            while(globalDate > 7) { //Normalizes the date so that the first full week of the new month will be shown
                globalDate -= 7;
                week--;
            }
        default:
            break;
    }





    tempDate = globalDate; //Temp variables used for building individual days in the calendar
    tempMonth = globalMonth;
    tempYear = globalYear;


    const monthTitle = document.createElement('div');
    monthTitle.className = 'h3 text-center position-relative py-2';
    monthTitle.innerHTML = `${MONTH_NAMES[globalMonth - 1]} ${globalYear}`;

    calendar_element.appendChild(monthTitle);



    CALENDAR_DAYS.forEach(day => {
        var card = document.createElement('div');


        card.className = 'col-sm m-1 bg-white rounded px-1 px-md-2 day';

        calendar_element.appendChild(card);

        const title = document.createElement('div');
        if(week === 0 && currentDate === tempDate) { //Checks if the current day is being displayed and highlights it blue (from css stylesheet)
            title.setAttribute('id', 'currentDay');
        }

        const weekDay = document.createElement('div');
        weekDay.className = 'h4 text-center position-relative py-2';
        weekDay.innerHTML = day;

        const fullDate = document.createElement('div');
        fullDate.className = 'h6 text-center position-relative py-2';
        fullDate.innerHTML = `${tempMonth}/${tempDate}/${tempYear}`;

        title.appendChild(weekDay);
        title.appendChild(fullDate);


        card.appendChild(title);


        const body = document.createElement('div');

        body.classList.add('event-container');

        card.appendChild(body);


        tempDate++;

        if(tempDate > maxDays[tempMonth - 1]) { //Adjustments to month and year based on if the date increase went out of range of the current month
            tempDate = 1;
            if(tempMonth === 12) {
                tempMonth = 1;
                tempYear++;
            }
            else {
                tempMonth++;
            }
        }

    })

}

function checkLeapYear() { //Does calculations based on the rules of leap years to change the number of days in Februrary
    if (globalYear % 4 === 0) {
        if (globalYear % 100 === 0) {
            if(globalYear % 400 === 0) {
                maxDays[1] = 29;
            }
            else {
                maxDays[1] = 28;
            }
        }
        else {
            maxDays[1] = 29;
        }
    }
    else {
        maxDays[1] = 28;
    }
}

