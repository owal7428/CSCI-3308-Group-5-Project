//Script code goes here

const CALENDAR_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
let maxDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

let globalDate;
let globalMonth;
let globalYear;
let week;
let currentDate;

function initialize_calendar() {

    if(!document.getElementById('calendar')) {
        return;
    }

    let today = new Date();
    currentDate = today.getDate();
    today.setDate(today.getDate() - today.getDay());
    globalDate = today.getDate();
    globalMonth = today.getMonth() + 1;
    globalYear = today.getFullYear();
    checkLeapYear();
    week = 0;

    change_calendar();
}


function change_calendar(operation) {
    const calendar_element = document.getElementById('calendar');
    calendar_element.innerHTML = '';



    switch(operation) {
        case 'previousMonth':
            if(globalMonth === 1) {
                globalMonth = 12;
                globalYear--;
                checkLeapYear();
            }
            else {
                globalMonth--;
            }
            if(globalDate >= 28) {
                globalDate = globalDate - 35 + maxDays[globalMonth - 1];
                week -= 5;
            }
            else {
                globalDate = globalDate - 28 + maxDays[globalMonth - 1];
                week -= 4;
            }
            while(globalDate > 7) {
                globalDate -= 7;
                week--;
            }
            break;
        case 'previousWeek':
            globalDate -= 7;
            week --;
            if(globalDate < 1) {
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
            initialize_calendar();
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
            if(globalDate < 4) {
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
            while(globalDate > 7) {
                globalDate -= 7;
                week--;
            }
        default:
            break;
    }





    tempDate = globalDate;
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
        if(week === 0 && currentDate === tempDate) {
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

        if(tempDate > maxDays[tempMonth - 1]) {
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

function checkLeapYear() {
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