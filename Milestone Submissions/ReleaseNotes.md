Release Notes - 11/3/2022

New + Improved:
* Completed Wireframe
* Project Board Created and Use cases added
* Began working on Login, Registation, and API's

Release Notes - 11/10/2022

New + Improved:
* Login Frontend and Backend completed. User now is prompted to login and username and password are checked with those on the database to make sure they match.
* Nav bar is completed. The user is now able to navigate to various pages on the website using the nav bar located at the top of the current page
* Registation Frontend and Backend completed. User is now given the option to register and inputed username and password are saved to the database.
* Weather API backend completed. Using an axios api call to meteomatics' weather API, the user is now able to see weather patterns and forcasts at a certain longitude and latitude. This will be implemeneted in the future to see weather data for an inputed city/state.
* Calender frontend completed. Allows user to see a calendar with 7 days, and switch between weeks and months as needed. This will eventually be updated with events and trips planned by the user.
* Landing page completed. User now has a way to access search bar, calendar, and other features when logining onto the site.
* Search Bar in development 
* Flight API backend in development 

Fixes:
* Fixed bug that allows multiple of the same users to be added to the table

Release Notes - 11/17/2022

New + Improved:
* Flight API backend functionality completed. Allows user to see flights and flight information to and from an inputed location.
* Alert messages functionality completed. The user is now presented with an alert to give feedback for various actions, including registration, logging in, and logging out.
* Search bar completed. Asks the user for only a location input, and the backend fills in the rest of the information. displaying of search results currently in development
* Coordinate API backend completed. Allows user input from search page to be entered into flight and weather API's. The user inputs City and Country names and the call returns the latitude and longitude of said city
* User and bug testing for API's and login/register has been completed. 
* Added SQL Table Expansion for Weather, Flight Number, and Calendar. 
* Added menu to profile page

Fixes:
* Fixed bug that made it so that the password that a user inputed was not hidden
* Fixed ability to view login, register, and logout pages. Users now cannot see login/register if logged in and logout if not register/logged in.
* A fix for certain race-conditions in login form that results in failed login feedback equivalent is in development. Currently, the user can tell if a user is or is not registered based on failed login attempt.

