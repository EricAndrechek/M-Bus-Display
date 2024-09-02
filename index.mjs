// This is built to be exposed as an API endpoint and hosted somewhere, like AWS Lambda

import https from "https";

const apikey = "YOUR API KEY FROM LTP HERE"; // based on the request rate of this project, you'll have to request a rate increase from LTP (or lower the rate of this project)

async function request(url) {
    return new Promise((resolve, reject) => {
        let req = https.request(url, function (res) {
            let body = "";
            res.on("data", (chunk) => {
                body += chunk;
            });
            res.on("end", () => {
                resolve(body);
            });
        });
        req.end();
    });
}

async function fetchBusData() {
    const response = await request(
        "https://mbus.ltp.umich.edu/bustime/api/v3/getpredictions?key=" +
            apikey +
            "&format=json&stpid=N407&time=" +
            new Date().getTime()
    );
    const data = JSON.parse(response);
    return data["bustime-response"].prd;
}

// Function to fetch additional details for a specific bus using its vid
async function fetchBusDetails(bus) {
    const { vid } = bus;
    let lat, lon, hdg, spd, psgld;
    if (vid) {
        const response = await request(
            `https://mbus.ltp.umich.edu/bustime/api/v3/getvehicles?key=` +
                apikey +
                `&format=json&vid=${vid}&time=` +
                new Date().getTime()
        );
        const data = JSON.parse(response);
        try {
            const busDetails = data["bustime-response"].vehicle[0]; // Assuming there's only one vehicle for the specified vid
            lat = busDetails.lat;
            lon = busDetails.lon;
            hdg = busDetails.hdg;
            spd = busDetails.spd;
            psgld = busDetails.psgld;
        } catch (err) {
            console.log(`error getting details for vehicle id ${vid}: ${data}`);
        }
    }

    const predictedArrival =
        bus.prdctdn === "DUE" ? "Now" : `${bus.prdctdn} minutes`;

    // Format distance
    const distanceToStop = formatDistance(bus.dstp);

    // Format expected arrival time
    const expectedArrivalTime = formatArrivalTime(bus.prdtm);

    // Format speed
    const speed = spd ? `${spd} mph` : "? mph";

    // Format heading
    const heading = hdg ? `${hdg}°` : "?°";

    // Format passenger load
    const passengerLoad = psgld ? psgld : "?";

    // Format bus ID - if we don't have a bus ID, use the arrival time (as it *shouldn't* change)
    const busID = bus.vid
        ? bus.vid
        : bus.prdtm.substring(9, 14).replace(":", "");

    // Format route
    const route = bus.rt;

    // Format destination
    const destination = bus.des;

    let busObject = {
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
    const formattedHour = (hour % 12 || 12).toString();
    const formattedMinute = minute.padStart(2, "0");
    const ampm = hour < 12 ? "AM" : "PM";

    const formattedTime = `${formattedHour}:${formattedMinute} ${ampm}`;

    return formattedTime;
}

async function updateBusInfo(busData) {
    if (busData && busData.length > 0) {
        let new_ui_data = [];
        for (const bus of busData) {
            const new_bus_data = await fetchBusDetails(bus);
            if (new_bus_data !== null && new_bus_data != null) {
                new_ui_data.push(new_bus_data);
            }
        }
        return new_ui_data;
    } else {
        return [];
    }
}

async function updateBusData() {
    const busData = await fetchBusData();
    let api_data = await updateBusInfo(busData);
    // sort api_data list by predictedArrival time
    // "Now" = 0, etc. Parse the string split at space and turn into number
    api_data.sort((a, b) => {
        let a_time = parseInt(a.predictedArrival.split(" ")[0]) || 0;
        let b_time = parseInt(b.predictedArrival.split(" ")[0]) || 0;
        return a_time - b_time;
    });
    for (let i = 0; i < api_data.length; i++) {
        api_data[i].index = i;
    }
    return api_data;
}

export async function handler(event) {
    let magic_bus_parsed = await updateBusData();

    const response = {
        statusCode: 200,
        body: magic_bus_parsed,
    };
    return response;
}
