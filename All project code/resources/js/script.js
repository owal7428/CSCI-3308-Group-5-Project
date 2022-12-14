let userTrips = [];
let userFlights = [];


const CALENDAR_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
let maxDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; //Can be changed if the current year is a leap year

const colors = ['rgb(21, 208, 102)', 'rgb(218, 34, 18)', 'rgb(158, 18, 218)', 'rgb(18, 25, 218)', 'rgb(218, 18, 201)']

const randomIndex = Math.floor(Math.random() * 4);

let globalDate; //Stores what date the user is currently looking at (always a sunday for normalization)
let globalMonth; //Stores what month the user is currently looking at
let globalYear; //Stores what year the user is currently looking at
let week; //Stores the offset of weeks that the user is currently on (0 means the week of the current date)
let currentDate; //Stores the current date in reality. Used to highlight the current date on the calendar

let ADD_TRIP_MODAL;
let VIEW_FLIGHT_MODAL;
let VIEW_TRIP_MODAL;

function initialize_calendar(trips, flights) { //Called at page load or when the user wants to return to the current date


    if(!document.getElementById('calendar')) { //Checks if this is indeed the profile page (this function is called on every body load)
        return;
    }

    if(trips && flights) {
        userTrips = JSON.parse(decodeURIComponent(trips));
        userTrips.forEach(tripInfo => {
            tripInfo.departure = new Date(tripInfo.departure),
            tripInfo.arrival = new Date(tripInfo.arrival)
        })

        userFlights = JSON.parse(decodeURIComponent(flights));
        userFlights.forEach(flightInfo => {
            flightInfo.flightDate = new Date(flightInfo.flightDate);
        })
        ADD_TRIP_MODAL = new bootstrap.Modal(document.getElementById('add-trip-modal'));
        VIEW_FLIGHT_MODAL = new bootstrap.Modal(document.getElementById('view-flight-modal'));
        VIEW_TRIP_MODAL = new bootstrap.Modal(document.getElementById('view-trip-modal'));
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
    monthTitle.className = 'h2 text-center position-relative py-2';
    monthTitle.innerHTML = `${MONTH_NAMES[globalMonth - 1]} ${globalYear}`; //Title for the calendar month (month is 0 indexed)

    calendar_element.appendChild(monthTitle);

    //The date objects below are used to store a range for the current week so that trips scheduled that week can be found
    const tempFullDate = new Date(`${tempMonth}-${tempDate}-${tempYear}`); //Creates a date object of the Sunday of the current week
    let tempFullDateEnd = new Date(`${tempFullDate.getMonth() + 1}-${tempFullDate.getDate()}-${tempFullDate.getFullYear()}`);
    tempFullDateEnd.setDate(tempFullDateEnd.getDate() + 6); //Sets a range for the week (stores the saturday of the current week)

    let tripsThisWeek = findTripsThisWeek(tempFullDate, tempFullDateEnd);
    let flightsThisWeek = findFlightsThisWeek(tempFullDate, tempFullDateEnd);


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

        if(flightsThisWeek.length > 0) {
            flightsThisWeek.forEach(flightObj => {
                const flightDate = flightObj.flight.flightDate.getDate();
                if(flightDate === tempDate) {
                    const flightCard = document.createElement('div');
                    flightCard.classList.add('tripCard');
                    if(flightObj.index === -1) {
                        flightCard.setAttribute('style', `background-color: black;`);
                    }
                    else {
                        flightCard.setAttribute('style', `background-color: ${colors[(flightObj.index + randomIndex) % 5]};`);
                    }
                    flightCard.innerHTML = `Flight to ${flightObj.flight.city}`;
                    flightCard.setAttribute('onclick', `open_flight_modal(${userFlights.indexOf(flightObj.flight)})`);
                    body.appendChild(flightCard);
                }
            })
        }

        if(tripsThisWeek.length > 0) { //Function to populate a day with trip cards. Only runs if there are trips scheduled for that week
            tripsThisWeek.forEach(tripObj => {
                const tripStart = tripObj.trip.departure.getDate(); //Stores the start date of tha trip 
                const tripEnd = tripObj.trip.arrival; //Stores the full date that the current trip ends
                if(!tripObj.started) { //If the current trip has not already started, this checks if the current date is the start date for that trip
                    if(tripStart === tempDate) {
                        tripObj.started = true;
                    }
                }
                if(tripObj.started && !tripObj.ended) {
                    const tripCard = document.createElement('div');
                    tripCard.classList.add('tripCard');
                    tripCard.setAttribute('style', `background-color: ${colors[(tripObj.index + randomIndex) % 5]};`); //Modulo to access the color array. Keeps the same color for each trip regardless of what week is currently being viewed
                    tripCard.innerHTML = `${tripObj.trip.city}`;
                    tripCard.setAttribute('onclick', `open_trip_modal(${userTrips.indexOf(tripObj.trip)})`);
                    body.appendChild(tripCard);
                }
                if(tripEnd.getFullYear() === tempYear && (tripEnd.getMonth() + 1) === tempMonth && tripEnd.getDate() === tempDate) {
                    tripObj.ended = true;
                }
            })
        }

        const addButton = document.createElement('div');
        addButton.classList.add('tripCard');
        addButton.classList.add('invisibleButton');
        addButton.setAttribute('id', `button${CALENDAR_DAYS.indexOf(day)}`);
        addButton.setAttribute('onmouseover', `show_button(${CALENDAR_DAYS.indexOf(day)})`);
        addButton.setAttribute('onmouseout', `hide_button(${CALENDAR_DAYS.indexOf(day)})`);
        addButton.innerHTML = '+';
        addButton.setAttribute('onclick', `open_add_trip_modal(${CALENDAR_DAYS.indexOf(day)})`)

        body.appendChild(addButton);


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


function findTripsThisWeek(startDate, endDate) {
    let returnedTrips = [];
    userTrips.forEach(trip => {
        let tripStart = trip.departure;
        let tripEnd = trip.arrival;
        if(startDate <= tripStart && tripStart <= endDate) {
            returnedTrips.push({
                trip: trip,
                started: false,
                ended: false,
                index: userTrips.indexOf(trip)
            });
        }
        else if(tripStart < startDate && tripEnd >= startDate) {
            returnedTrips.push({
                trip: trip,
                started: true,
                ended: false,
                index: userTrips.indexOf(trip)
            });
        }
    })
    return returnedTrips;
}

function findFlightsThisWeek(startDate, endDate) {
    let returnedFlights = [];
    userFlights.forEach(flight => {
        let flightDate = flight.flightDate;
        let index = -1;
        userTrips.forEach(trip => {
            if(trip.city === flight.city) {
                index = userTrips.indexOf(trip);
            }
        })
        if(flightDate >= startDate && flightDate <= endDate) {
            returnedFlights.push({
                flight: flight,
                index: index
            });
        }
    })
    return returnedFlights;
}


function open_add_trip_modal(index) {

    let tempDate = new Date(`${globalMonth}-${globalDate}-${globalYear}`);
    tempDate.setDate(tempDate.getDate() + index);

    const startDate = document.querySelector('#startDate');

    startDate.setAttribute('value', `${tempDate.getFullYear()}-${tempDate.getMonth() < 9 ? '0' + (tempDate.getMonth() + 1) : tempDate.getMonth() + 1}-${tempDate.getDate() < 10 ? '0' + tempDate.getDate() : tempDate.getDate()}`);


    ADD_TRIP_MODAL.show();
}

function open_flight_modal(index) {

    const flight = userFlights[index];
    const flightTime = flight.flightTime.split(':');
    let timeString;

    if(parseInt(flightTime[0]) > 12) {
        timeString = `${flightTime[0] - 12}:${flightTime[1]} PM`;
    }
    else if (parseInt(flightTime[0]) === 12) {
        timeString = `${flightTime[0]}:${flightTime[1]} PM`;
    }
    else {
        timeString = `${flightTime[0]}:${flightTime[1]} AM`;
    }


    document.querySelector('#destination').innerHTML = `Flight to ${flight.city}, ${flight.country}`;
    document.querySelector('#date').innerHTML = `Date: ${flight.flightDate.toDateString()}`;
    document.querySelector('#time').innerHTML = `Time: ${timeString}`;
    document.querySelector('#airline').innerHTML = `Airline: ${flight.airline}`;
    document.querySelector('#airport').innerHTML = `Arriving at ${flight.airport}`;
    document.querySelector('#flight-number').innerHTML = `Flight Number: ${flight.flightNumber}`;
    document.querySelector('#flightID').value = flight.flightID;
    




    VIEW_FLIGHT_MODAL.show();
}

function open_trip_modal(index) {

    const trip = userTrips[index];

    document.querySelector('#tripDestination').innerHTML = `Trip to ${trip.city}, ${trip.country}`;
    document.querySelector('#tripDeparture').innerHTML = `Leaving: ${trip.departure.toDateString()}`;
    document.querySelector('#tripReturn').innerHTML = `Returning: ${trip.arrival.toDateString()}`;

    document.querySelector('#tripID').value = trip.tripID;

    VIEW_TRIP_MODAL.show();
}

function show_button(index) {
    const button = document.querySelector(`#button${index}`);

    button.classList.remove('invisibleButton');
    button.classList.add('visibleButton');
    button.innerHTML = `Add Trip`;
}

function hide_button(index) {
    const button = document.querySelector(`#button${index}`);

    button.classList.remove('visibleButton');
    button.classList.add('invisibleButton');
    button.innerHTML = '+';
}