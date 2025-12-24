// Sample JavaScript file with intentional issues for testing the code review engine

const apiKey = "sk_live_abcdefghij1234567890"; // Hardcoded secret

async function fetchData(url) {
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

function processItems(items, req) {
    const x = req.body.userId; // Unchecked external input

    for (let i = 0; i < items.length; i++) {
        if (items[i].active) {
            if (items[i].type === 'premium') {
                if (items[i].status === 'verified') {
                    if (items[i].balance > 0) {
                        if (items[i].currency === 'USD') {
                            // Deep nesting
                            console.log(items[i]);
                        }
                    }
                }
            }
        }
    }

    // Using eval
    eval("console.log('dangerous')");

    // Unchecked array access
    const first = items[0];

    // SQL injection risk
    const query = "SELECT * FROM users WHERE id = " + req.body.id;

    return query;
}

function veryLongFunction() {
    // Line 1
    // Line 2
    // Line 3
    // Line 4
    // Line 5
    // Line 6
    // Line 7
    // Line 8
    // Line 9
    // Line 10
    // Line 11
    // Line 12
    // Line 13
    // Line 14
    // Line 15
    // Line 16
    // Line 17
    // Line 18
    // Line 19
    // Line 20
    // Line 21
    // Line 22
    // Line 23
    // Line 24
    // Line 25
    // Line 26
    // Line 27
    // Line 28
    // Line 29
    // Line 30
    // Line 31
    // Line 32
    // Line 33
    // Line 34
    // Line 35
    // Line 36
    // Line 37
    // Line 38
    // Line 39
    // Line 40
    // Line 41
    // Line 42
    return true;
}

function complexFunction(a, b, c, d) {
    if (a > 0) {
        if (b > 0) {
            for (let i = 0; i < 10; i++) {
                if (c) {
                    while (d) {
                        switch (a) {
                            case 1:
                                return 1;
                            case 2:
                                return 2;
                            case 3:
                                return 3;
                            default:
                                return a && b ? c || d : null;
                        }
                    }
                }
            }
        }
    }
    return null;
}

module.exports = { fetchData, processItems, veryLongFunction, complexFunction };
