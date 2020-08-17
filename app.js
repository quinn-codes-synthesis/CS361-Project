/*
app.js

Created On: 7/12/2020
Last Updated On: 8/13/2020
Description: Entry point for "The Apple Cart" web app, Store Inventory Management System
*/

/*
Dependencies
*/

const express = require('express')
const exphbs = require('express-handlebars')
const mysql = require('mysql')
const session = require('express-session');
const { json } = require('express');


/*
Create Express Server
*/

const app = express()

/*
Configure Express Server
*/

app.engine('hbs', exphbs(
    {
        defaultLayout: 'main',
        extname: '.hbs'
    }
))
app.set('view engine', 'hbs')

app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: false}))
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));

/*
Environment Configuration
*/

try {
    var config = require('./config')
    var DATABASE_CREDENTIALS = config.LOCAL_DATABASE_CREDENTIALS
    process.env.PORT = 8080
} catch(err) {
    var DATABASE_CREDENTIALS = process.env.CLEARDB_DATABASE_URL
}

/*
Database Setup and Configuration
*/

const connection = mysql.createPool(DATABASE_CREDENTIALS)

/*
Routing
*/

// Login route
app.get('/login', function(req, res) {
    res.render('login', {login:1});
});

// Logout route
app.get('/logout', function(req, res) {
    if (req.session.loggedin === true) {
        req.session.loggedin = false;
    }
    res.redirect('/login');
});

// Login authentication route
app.post('/login', function(req, res) {
	const username = req.body.username;
    const password = req.body.password;

	if (username && password) {
		connection.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {
			if (results.length > 0) {
				req.session.loggedin = true;
                req.session.username = username;
                req.session.userId = results[0].id;
				res.redirect('/');
			} else {
                res.render('login', {badLogin: true, login: 1});
			}
		});
	} else {
		res.send('Please enter Username and Password!');
	}
});

// Home/Main/Dashboard Route
app.get('/', function(req, res) {

    if (req.session.loggedin) {
        // Simple query to make sure the database is connected.
        let data = 'ClearDB Connected.'
        
        //Total items in catalog
        connection.query('SELECT COUNT(*) as numItems, COUNT(DISTINCT type) AS numTypes FROM products WHERE active is True', function(error, results, fields){
            if (error) {
                data = 'ClearDB is down!'
                console.log(error)
                res.render('home', {data: data})
            } else {
                numItems = results[0].numItems;
                numTypes = results[0].numTypes;   
                res.render('home', {data: data, numItems:numItems, numTypes:numTypes, dashboard: 1})
            }
        })

          

    } else {
        res.redirect('/login')
        // res.send('Please login to view this page!');
    }
})

// User Route
app.get('/user', function(req, res) {
    if (req.session.loggedin) {
        // Change this to change the query going to the DB
        const userQueryString = 'SELECT id, first_name, last_name FROM users WHERE active is TRUE'

        // Requesting the data from the database
        connection.query(userQueryString, function(error, results, fields){
            if (error) {
                console.log('Error display users: ' + error)
                res.send('Error display users: ' + error)
            } else {           
                res.render('user', {sqlResults: results, user: 1})
            }
        })        
    } else {
        res.redirect('/login')
    }
})

// Users - New User Route
app.post('/user/new_user', function(req, res) {

    // Get the data from the POST request body
    const fname = req.body.fist_name_input;
    const lname = req.body.last_name_input;
    const e_mail = req.body.email_input;
    const uname = req.body.username_input;
    const pword = req.body.password_input;

    // If duplicate user is added, it will change active flag to 1. If active flag is already 1, nothing will happen.
    // Duplicate is determined by username or email being in use already.

    const addUserQueryString =
        `INSERT INTO users (first_name, last_name, email, role_id, active, username, password) VALUES
        ('${fname}', '${lname}', '${e_mail}', '${1}', '${1}', '${uname}', '${pword}')
        ON DUPLICATE KEY UPDATE active = 1`

    // Send the query, if it fails, log to console, if it succeeds, update the screen.
    connection.query(addUserQueryString, function(error, results, fields){
        if (error) {
            console.log('Error adding user to users: ' + error)
            res.send('Error adding user to users: ' + error)
        } else {
            res.redirect('/user')
        }
    })
})

// Users - Remove User Route
app.post('/user/remove_user', function (req, res) {

    // Grab the necessary data from the POST request body
    const user_id = req.body.user_id_input;
    
    // Form the SQL Query needed to update the product catalog
    const rem_user_query_string = `UPDATE users SET active = 0 WHERE id = '${user_id}'` 

    // Send the query, if it fails, log to console, if it succeeds, update the screen.
    connection.query(rem_user_query_string, function (error, results, fields) {
        if (error) {
            console.log('Error removing user from users: ' + error)
            res.send('Error removing user from users: ' + error)
        } else {
            res.redirect('/user')
        }
    })
})

/* 
Product Catalog Route
User will be able to view the active products in the product catalog
*/
app.get('/product_catalog', function(req, res) {
    if (req.session.loggedin) {
        // Change this to change the query going to the DB
        const productCatalogQueryString = 'SELECT id, name, type, price, unit, description FROM products WHERE active is TRUE'

        // Requesting the data from the database
        connection.query(productCatalogQueryString, function(error, results, fields){
            if (error) {
                console.log('Error loading product_catalog: ' + error)
                res.send('Error loading product_catalog: ' + error)
            } else {
                res.render('product_catalog', {sqlResults: results, product_catalog: 1})
            }
        })
    } else {
        res.redirect('/login')
    }
})

// Products - New Product Route
app.post('/product_catalog/new_product', function(req, res) {

    // Grab the necessary data from the POST request body
    const name = req.body.name_input;
    const type = req.body.type_input;
    const price = req.body.price_input;
    const unit = req.body.unit_input;
    const description = req.body.description_input;

    // Change this to change the query going to the DB
    /* If adding duplicate item, nothing will change
       If adding inactive item, active will change from false to true
       else insert as normal.
       If we ever want to change this function to add and update, we 
       can just add more columns after update*/

    const addProductQueryString =
        `INSERT INTO products (name, type, price, unit, description) VALUES
        ('${name}', '${type}', '${price}', '${unit}', '${description}')
        ON DUPLICATE KEY UPDATE active = 1`

    // Send the query, if it fails, log to console, if it succeeds, update the screen.
    connection.query(addProductQueryString, function(error, results, fields){
        if (error) {
            console.log('Error adding product to catalog: ' + error)
            res.send('Error adding product to catalog: ' + error)
        } else {
            res.redirect('/product_catalog')
        }
    })
})

// Products - Remove product Route
app.post('/product_catalog/remove_product', function (req, res) {

    // Grab the necessary data from the POST request body
    const product_name = req.body.product_name_input;
    
    // Form the SQL Query needed to update the product catalog
    const rem_product_query_string = `UPDATE products SET active = 0 WHERE name = '${product_name}'` 

    // Send the query, if it fails, log to console, if it succeeds, update the screen.
    connection.query(rem_product_query_string, function (error, results, fields) {
        if (error) {
            console.log('Error removing product from catalog: ' + error)
            res.send('Error removing product from catalog: ' + error)
        } else {
            res.redirect('/product_catalog')
        }
    })
})


// Inventory Route
app.get('/inventory', function(req, res) {
    if (req.session.loggedin) {
        // Change this to change the query going to the DB
        var inventoryQueryString =    
            `SELECT id, name, shelf_quantity, DATE_FORMAT(exp_date,'%m-%d-%Y') AS exp_date, 
            wh_quantity, shelf_quantity + wh_quantity AS total_quantity,
            shelf_min_threshold, shelf_max_threshold, wh_min_threshold, wh_max_threshold, active FROM products;`

        // Requesting the data from the database
        connection.query(inventoryQueryString, function(error, results, fields){
            if (error) {
            var data = 'Error in querying the database.'
            console.log(error)
            res.render('inventory', {data:data})
            }

            // Check for not active item
            results.forEach(function(value, index) {
                if (value.active != 0) {
                    value.not_catalog = false
                } else {
                    value.not_catalog = true
                }
            })

            // Check for "Active" items that are low on the shelf and set .shelf_low to true if they are
            results.forEach(function(value, index) {
                if (value.shelf_quantity < value.shelf_min_threshold && value.active != 0) {
                    value.shelf_low = true
                } else {
                    value.shelf_low = false
                }
            })

            // Check for "Active" items that are low in the warehouse and set .wh_low to true if they are
            results.forEach(function(value, index) {
                if (value.wh_quantity < value.wh_min_threshold && value.active != 0) {
                    value.wh_low = true
                } else {
                    value.wh_low = false
                }
            })

            // Send the data to the inventory template
            res.render('inventory', {results: results, inventory: 1})
        })
    } else {
        res.redirect('/login')
    }
  })

// Transaction Routes

app.get('/transaction', function (req, res) {
    if (req.session.loggedin) {
        let return_query_string = 'SELECT * FROM products';

        // Send the query, if it fails, log to console, if it succeeds, update the screen.
        connection.query(return_query_string, function (error, results, fields) {
            if (error) {
                console.log("Dynamic dropdown population failed...");
            } else {
                res.render('transaction', { sqlResults: results, transaction: 1 });
            }
        })
    } else {
        res.redirect('/login')
    }
})

app.post('/transaction/get_data', function(req, res){
    var getDataQueryString = req.body.requestedData
    connection.query(getDataQueryString, function(error, results, fields){
        
        // Handle errors
        if (error) {
            console.log(error)
        }
        
        // Parse the data and send it. We append the user id to the results so we can audit who made what sales
        results = JSON.parse(JSON.stringify(results))
        data = {}
        results.forEach(element => {
            data[element.id] = element
        })
        data.userId = req.session.userId
        res.send(JSON.stringify(data))
    })
})

// Inventory - New Item Route
app.post('/inventory/new_item', function(req, res) {

    // Grab the necessary data from the POST request body
    var product_name = req.body.product_name_input;
    var wh_inventory = req.body.product_warehouse_inventory_input;
    var shelf_inventory = req.body.product_shelf_inventory_input;
    var expiration_date = req.body.product_expiration_date_input;

    // Change this to change the query going to the DB
    var addInventoryQueryString =
        `UPDATE products 
        SET exp_date = '${expiration_date}', shelf_quantity = shelf_quantity + ${shelf_inventory}, wh_quantity = wh_quantity + ${wh_inventory} 
        WHERE name = '${product_name}'`

    // Send the query, if it fails, log to console, if it succeeds, update the screen.
    connection.query(addInventoryQueryString, function(error, results, fields){
        if (error) {
            console.log('Add item inventory failed...')
            console.log(error)
        } else {
            res.redirect('/inventory')
        }
    })
})

// Inventory - Remove Item Route
app.post('/inventory/remove_item', function (req, res) {

    // Grab the necessary data from the POST request body
    var product_name = req.body.product_name_input;
    var wh_inventory = req.body.product_warehouse_inventory_input;
    var shelf_inventory = req.body.product_shelf_inventory_input;

    // Form the SQL Query needed to update the product inventory
    var rem_inventory_query_string = 
        `UPDATE products 
        SET shelf_quantity = shelf_quantity - ${shelf_inventory}, wh_quantity = wh_quantity - ${wh_inventory}
        WHERE name = '${product_name}'`

    // Send the query, if it fails, log to console, if it succeeds, update the screen.
    connection.query(rem_inventory_query_string, function (error, results, fields) {
        if (error) {
            console.log("Remove item inventory failed...")
        } else {
            res.redirect('/inventory')
        }
    })
})

// Inventory - Modify Item Route
app.post('/inventory/modify_item', function(req, res) {
    
    // Grab the necessary data from the POST request body
    const id = req.body.modal_shelf_id;
    const min = req.body.modal_shelf_minimum_threshold
    const max = req.body.modal_shelf_maximum_threshold
    const wh_min = req.body.modal_wh_minimum_threshold
    const wh_max = req.body.modal_wh_maximum_threshold
    
    // Form the SQL Query needed to update the shelf thresholds
    var mod_inventory_query_string = `UPDATE products SET shelf_min_threshold='${min}', shelf_max_threshold='${max}', wh_min_threshold='${wh_min}', wh_max_threshold='${wh_max}' WHERE id='${id}'`

    // Send the query, if it fails, log to console, if it succeeds, update the row and refresh the data on the screen.
    connection.query(mod_inventory_query_string, function(error, results, fields) {
        if (error) {
            console.log("Modify item in inventory failed...\n" + error)
        } else {
            res.redirect('/inventory')
        }
    })
})

// Returns
app.get('/returns', function (req, res) {
    if (req.session.loggedin) {
        let return_query_string = 'SELECT * FROM products';

        // Send the query, if it fails, log to console, if it succeeds, update the screen.
        connection.query(return_query_string, function (error, results, fields) {
            if (error) {
                console.log("Dynamic dropdown population failed...");
            } else {
                res.render('returns', { sqlResults: results, returns: 1 });
            }
        })
    } else {
        res.redirect('/login')
    }
})

app.post('/returns/', function (req, res) {
    // Grab the necessary data from the POST request body
    const productName = req.body.product_name_input;
    const numProduct = req.body.quantity_input;

    // res.render('transaction', { goodReturn: true, numProduct: numProduct, productName: productName });

    let return_query_string = 'SELECT * FROM products';

    // Send the query, if it fails, log to console, if it succeeds, update the screen.
    connection.query(return_query_string, function (error, results, fields) {
        if (error) {
            console.log("Dynamic dropdown population failed...");
        } else {
            res.render('returns', { sqlResults: results, returns: 1, numProduct: numProduct, productName: productName, goodReturn: true });

        }
    })
})


/*
Listener
*/

const port = process.env.PORT;
app.listen(port, () => console.log(`Listening on port ${port}...`));

/*
Error Handling
*/
