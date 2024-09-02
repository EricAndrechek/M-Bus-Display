// This file is outdated and unmaintained, but was at one point used instead of the server API to fetch bus data. It is kept here for reference purposes only. You can try to implement it back in the project if you want to fetch bus data directly from the LTP API from your client-side code, but you'll have to handle CORS issues and rate limiting yourself. It's recommended to use the server API instead, especially if you are using a low-power device like an RPi Zero or want to potentially view the webpage from multiple devices without hitting the rate limit.

const apikey = "YOUR API KEY FROM LTP HERE"; // based on the request rate of this project, you'll have to request a rate increase from LTP (or lower the rate of this project)

async function fetchBusData() {
    const response = await fetch(
        "https://corsproxy.io/?https://mbus.ltp.umich.edu/bustime/api/v3/getpredictions?key=" +
            apikey +
            "&format=json&stpid=N407&time=" +
            new Date().getTime()
    );
    const data = await response.json();
    return data["bustime-response"].prd;
}

// Function to fetch additional details for a specific bus using its vid
async function fetchBusDetails(bus, busInfoContainer) {
    const { vid } = bus;
    if (!vid) {
        return;
    }
    const response = await fetch(
        `https://corsproxy.io/?https://mbus.ltp.umich.edu/bustime/api/v3/getvehicles?key=` +
            apikey +
            `&format=json&vid=${vid}&time=` +
            new Date().getTime()
    );
    const data = await response.json();
    const busDetails = data["bustime-response"].vehicle[0]; // Assuming there's only one vehicle for the specified vid
    const { lat, lon, hdg, spd, psgld } = busDetails;

    const predictedArrival =
        bus.prdctdn === "DUE" ? "Now" : `${bus.prdctdn} minutes`;

    // Format distance
    const distanceToStop = formatDistance(bus.dstp);

    // Format expected arrival time
    const expectedArrivalTime = formatArrivalTime(bus.prdtm);

    // Format speed
    const speed = `${spd} mph`;

    // Format heading
    const heading = `${hdg}°`;

    // Format passenger load
    const passengerLoad = psgld;

    // Format bus ID
    const busID = bus.vid;

    // Format route
    const route = bus.rt;

    // Format destination
    const destination = bus.des;

    busObject = {
        vid: busID,
        route: route,
        destination: destination,
        predictedArrival: predictedArrival,
        delayed: bus.dly,
        distance: distanceToStop,
        capacity: passengerLoad,
        latitutde: lat,
        longitude: lon,
        heading: heading,
        speed: speed,
        arrivalTime: expectedArrivalTime,
    };

    return busObject;
}

function formatDistance(distance) {
    if (distance > 5280 * 0.25) {
        // Convert to miles
        const miles = (distance / 5280).toFixed(2);
        return `${miles} miles`;
    } else {
        // Display in feet with commas
        return (
            distance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " feet"
        );
    }
}

// Function to format expected arrival time to human-readable text
function formatArrivalTime(expectedArrivalTime) {
    const year = expectedArrivalTime.substring(0, 4);
    const month = expectedArrivalTime.substring(4, 6);
    const day = expectedArrivalTime.substring(6, 8);
    const hour = expectedArrivalTime.substring(9, 11);
    const minute = expectedArrivalTime.substring(12, 14);

    // Convert to 12-hour format and add zero-padding
    const formattedHour = (hour % 12 || 12).toString().padStart(2, "0");
    const formattedMinute = minute.padStart(2, "0");
    const ampm = hour < 12 ? "AM" : "PM";

    const formattedTime = `${formattedHour}:${formattedMinute} ${ampm}`;

    return formattedTime;
}

async function updateBusInfo(busData) {
    if (busData && busData.length > 0) {
        if (busUpdaterInterval === 300000) {
            clearInterval(busUpdater);
            busUpdater = setInterval(() => {
                updateBusData();
            }, 10000);
            busUpdaterInterval = 10000;
        }
        let new_ui_data = [];
        for (const bus of busData) {
            const new_bus_data = await fetchBusDetails(bus);
            new_ui_data.push(new_bus_data);
        }
        updateBusUI(new_ui_data);
    } else {
        updateBusUI([]);
        // change busUpdater setInterval to 5 minutes if no buses are running
        clearInterval(busUpdater);
        busUpdater = setInterval(() => {
            updateBusData();
        }, 300000);
        busUpdaterInterval = 300000;
    }
}

async function updateBusData() {
    const busData = await fetchBusData();
    await updateBusInfo(busData);
}
