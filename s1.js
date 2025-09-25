const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

let textParts = [];
let users = [];
let completedParts = {};




// Load the Tehilim text from the file
function loadTextParts() {
	const text = fs.readFileSync('./tehilim.txt', 'utf-8');
	textParts = text.split('part').filter(part => part.trim() !== '').map((part, index) => ({
		id: index + 1,
		text: part.trim(),
	}));
}

// Automatically initialize the names and text parts when the server starts
function initialize() {
	users = ['סבתא', 'עופר', 'נועה', 'גלעד', 'רותם', 'עמית', 'עידן', 'איתמר', 'שיר', 'טל', 'רועי', 'אייל', 'בת שבע', 'יפעת', 'עידו', 'הילה', 'איריס', 'אלי', 'מור', 'עדיאל', 'אליהו', 'שירה', 'גלי', 'חגי', 'רותם', 'לירז', 'לירון', 'סימון', 'לילך', 'גיא', 'מוריה', 'דור', 'חנה', 'שגיא', 'אשתו', 'עדי', 'יהלי', 'מעיין', 'אלון', 'רויטל', 'סתיו', 'ליהי', 'אורי', 'כפיר', 'עפרה', 'אליה', 'ניתאי', 'יוסף', 'מאור', 'סמדר', 'נעם', 'רוני', 'נווה'];

	loadTextParts();

	completedParts = {};
	users.forEach(user => {
		completedParts[user] = [];
	});
}


// Call the initialize function when the server starts
initialize();

// Get the parts assigned to a user in a round-robin fashion
app.get('/parts/:name', (req, res) => {
	const name = req.params.name;
	if (!users.includes(name)) {
		return res.status(400).json({ error: 'User ' + req.params.name + ' not found' });
	}

	const userIndex = users.indexOf(name);

	// Round-robin assignment: Assign parts to users by cycling through users
	const userParts = textParts.filter((_, index) => index % users.length === userIndex);

	res.json({ userParts, completed: completedParts[name] });
});


app.get('/cleanCompleted',(req,res) => {
	
		completedParts = {};
		
		users.forEach(user => {
		completedParts[user] = [];
	});
	
	return "cleaned completed!";
} );

// Mark a part as completed
app.post('/complete', (req, res) => {
	const { name, partId } = req.body;
	if (!users.includes(name) || !textParts.some(part => part.id === partId)) {
		return res.status(400).json({ error: 'Invalid user or part ID' });
	}

	if (!completedParts[name].includes(partId)) {
		completedParts[name].push(partId);
	}

	res.json({ message: 'Part marked as completed', completedParts });
	});

// Get the status of all parts
app.get('/status', (req, res) => {
	res.json({ completedParts });
});


//	Reset all the completed parts.
app.post('/resetcompleted', (req, res) => {
	
	completedParts = {};
	users.forEach(user => {
		completedParts[user] = [];
	});
	
});


// Start the server
const PORT = 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
