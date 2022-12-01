First TA Meeting (15 minutes): November 3rd, 2022 

Notes: 
* Showed Nikita the completed wireframe and plan for the project
* project board completed and presented including use cases. 
* Discussed which API's we were planning on using and got feedback
* No current roles assigned, we will implement and divide as we go



Second TA Meeting (15 minutes): November 10th, 2022

Notes:

* Showed Nikita progress on Login page and register frontend and backend
* Presented merge/pull requests for alerts and calender, and nav bar
* Decided to use 3 API's - Flight, Weather, and Coordinate
  * Flight API - Allows user to find flights to and from an inputed city
  * Weather API - Allows user to research weather patterns and forcast for a certain city to encourage or discourage them to book a trip there
  * Coordinate API - Works in tandem with Weather API, allows cities to be converted to latitude and longitude coordinates to input into Weather API.
* Discussed necessity of release notes section
* Roles were assigned in the group meeting following the TA meeting.

Group Meeting (30 minutes): November 10th, 2022

Discussed feedback from TA and next week's plans. We went over the project board and reviewed our user requirements. Then, we designated roles for individual tasks, with this as each person's role:

* Zane: Working on calender, can help with search frontend.
* Vincent: City -> Latitude and Longitude API
* Neil: Flight API. 
* Ethan: Databases. Can help with homepage and search.
* Kyle: Weather API. Can help with frontend, connecting to backend.

Notes from Group meeting:

* Try to keep things seperate from home page for now, i.e. search results
* Focus on functioning backend, try not to worry about ascetics for now
* Weather API gives us single data point, not map, so keep in mind for SQL database
* Use request format function from Kyle for API requests

Third TA Meeting (15 minutes): November 17th, 2022

* We presented our progress for the week, including the landing page, the search feature, better login capability, further calender progress, more database capability, and error handling.
* We asked questions on how to share our private api keys between each other:
We can either each make individual accounts, or share keys privately between ourselves, and both solutions work.
* We presented our documentation, including meeting notes, future plans, and release notes, and verified that we are doing it in the correct format.
* For the following week, we plan on polishing the frontend to improve the user experience, completing the search results page, calender, and allow the user to save their trips to their account.
* See release notes and future plans documentation for more details.


Group Meeting (100 minutes): November 18th, 2022

Discussed final touches needed to make the project user friendly. Finished working on flight api, and found an issue with ICAO codes to city/country. Decided to use a 4th API to convert these using the same techniques from the coordinates to city API. 

* Zane: Finish calender.
* Vincent: Convert from country to ISO codes
* Neil: Work on CSS and making website user friendly and better looking, work on slideshow. 
* Ethan: Databases.
* Kyle: Help with finishing search results.

Notes:
* Finish reformatting data results to make it so that the user only sees what they want/need.
* Have slideshow and website ready by Monday
* TA meeting is Monday 3:30 - present website and slidedeck, get feedback from Nikita.

Fourth TA Meeting (15 minutes): November 28th, 2022:

We presented our progress on our presentation and asked for feedback.

Feedback:
* Cut down on extra information. We only have 10 minutes for both the presentation and the demo.
* First part: Presentation, ~5 minutes
* Second part: Demo, ~5 minutes

Presentation:
* Have specific challenges for each page.
* Don't have too much detail.
* Include more high level information only.

Demo:
* Make a specific flow of steps to do in the demo.
* For example, start with registration, then move on to landing page, etc.
* Create a demo video in case something goes wrong.

