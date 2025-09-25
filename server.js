const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve static files (HTML, CSS, JS)
app.use(express.static('.'));

let textParts = [];
let families = {}; // New structure: { familyName: { members: [], chapterDistribution: {}, completedParts: {}, adminPassword: '' } }

// Load the Tehilim text from the file
function loadTextParts() {
	const text = fs.readFileSync('./tehilim.txt', 'utf-8');
	textParts = text.split('part').filter(part => part.trim() !== '').map((part, index) => ({
		id: index + 1,
		text: part.trim(),
	}));
}

// Load families data from JSON file
function loadFamilies() {
	const familiesPath = './families.json';
	try {
		if (fs.existsSync(familiesPath)) {
			const data = fs.readFileSync(familiesPath, 'utf-8');
			families = JSON.parse(data);
		}
	} catch (error) {
		console.error('Error loading families data:', error);
		families = {};
	}
}

// Save families data to JSON file
function saveFamilies() {
	try {
		fs.writeFileSync('./families.json', JSON.stringify(families, null, 2));
	} catch (error) {
		console.error('Error saving families data:', error);
	}
}

// Automatically distribute 150 chapters among family members
function distributeChapters(members) {
	const totalChapters = 150;
	const distribution = {};

	members.forEach(member => {
		distribution[member] = [];
	});

	// Simple round-robin distribution
	for (let i = 1; i <= totalChapters; i++) {
		const memberIndex = (i - 1) % members.length;
		distribution[members[memberIndex]].push(i);
	}

	return distribution;
}

// Hard-coded chapter distribution for each user
const chapterDistribution = {
	'סבתא': [1, 119],
	'עופר': [2, 55, 108],
	'נועה': [3, 56, 109],
	'גלעד': [4, 57, 110],
	'רותם_ג': [111, 139],
	'עמית': [6, 112, 116],
	'עידן': [7, 113],
	'איתמר': [8, 61, 114],
	'שיר': [9, 62, 115],
	'טל': [10, 59, 63],
	'רועי': [11, 64, 117],
	'אייל': [12, 60, 77, 78, 118],
	'בת_שבע': [13, 50, 54, 66, 107],
	'יפעת': [14, 67, 120],
	'עידו': [15, 68, 129],
	'הילה': [16, 69, 122],
	'איריס': [5, 17, 70, 123],
	'אלי': [18, 71, 127],
	'מור': [19, 72, 104],
	'עדיאל': [73, 103, 126],
	'אליהו': [21, 74, 127],
	'שירה': [22, 75, 128],
	'גלי': [23, 121],
	'חגי': [130, 28],
	'רותם_ד': [25, 131],
	'לירז': [26, 79, 132],
	'לירון': [27, 80, 133],
	'סימון': [28, 81, 134],
	'לילך': [29, 82, 135],
	'גיא': [30, 83, 136],
	'מוריה': [31, 84, 137],
	'דור': [32, 85, 138],
	'חנה': [33, 86],
	'שגיא': [34, 87, 140],
	'אלה': [35, 88, 141],
	'עדי': [36, 47, 142],
	'יהלי': [37, 90, 143],
	'מעיין': [91, 144],
	'אלון': [39, 92, 145],
	'רויטל': [40, 93, 146],
	'סתיו': [41, 94, 147],
	'ליהי': [42, 95, 148],
	'אורי': [43, 96, 149],
	'כפיר': [44, 97, 150],
	'עפרה': [45, 98],
	'אליה': [46, 99],
	'ניתאי': [89, 100],
	'יוסף': [48, 101],
	'מאור': [49, 76, 102],
	'סמדר': [20, 24, 65],
	'נעם': [51, 125],
	'רוני': [52, 58, 105],
	'נווה': [53, 106],
	'הראל': [65, 51]
};

// Initialize the server with existing families or create demo family for backward compatibility
function initialize() {
	loadTextParts();
	loadFamilies();

	// Always ensure the 'gueta' family exists with the predefined distribution
	const guetaMembers = Object.keys(chapterDistribution);
	families['gueta'] = {
		members: guetaMembers,
		chapterDistribution: chapterDistribution,
		completedParts: {},
		adminPassword: 'gueta123' // Default password for gueta family
	};

	guetaMembers.forEach(user => {
		if (!families['gueta'].completedParts[user]) {
			families['gueta'].completedParts[user] = [];
		}
	});

	// If no other families exist, also create the original family for backward compatibility
	if (Object.keys(families).length === 1) { // Only gueta exists
		const originalMembers = Object.keys(chapterDistribution);
		families['original'] = {
			members: originalMembers,
			chapterDistribution: chapterDistribution,
			completedParts: {},
			adminPassword: 'admin123' // Default password
		};

		originalMembers.forEach(user => {
			families['original'].completedParts[user] = [];
		});
	}

	saveFamilies();
}

// Family registration endpoint
app.post('/api/families/register', (req, res) => {
	const { familyName, members, adminPassword } = req.body;

	if (!familyName || !members || !adminPassword || members.length === 0) {
		return res.status(400).json({ error: 'Family name, members list, and admin password are required' });
	}

	if (families[familyName]) {
		return res.status(400).json({ error: 'Family name already exists' });
	}

	const chapterDistribution = distributeChapters(members);
	const completedParts = {};

	members.forEach(member => {
		completedParts[member] = [];
	});

	families[familyName] = {
		members,
		chapterDistribution,
		completedParts,
		adminPassword,
		createdAt: new Date().toISOString()
	};

	saveFamilies();

	res.json({
		message: 'Family registered successfully',
		familyName,
		members,
		chapterDistribution
	});
});

// Family login endpoint
app.post('/api/families/:familyName/login', (req, res) => {
	const { familyName } = req.params;
	const { password } = req.body;

	if (!families[familyName]) {
		return res.status(404).json({ error: 'Family not found' });
	}

	if (families[familyName].adminPassword !== password) {
		return res.status(401).json({ error: 'Invalid password' });
	}

	res.json({
		message: 'Login successful',
		family: {
			name: familyName,
			members: families[familyName].members,
			chapterDistribution: families[familyName].chapterDistribution
		}
	});
});

// Call the initialize function when the server starts
initialize();

// Get the parts assigned to a user based on the family's chapter distribution
app.get('/:familyName/parts/:name', (req, res) => {
	const { familyName, name } = req.params;

	if (!families[familyName]) {
		return res.status(404).json({ error: 'Family not found' });
	}

	const family = families[familyName];
	if (!family.members.includes(name)) {
		return res.status(400).json({ error: 'User ' + name + ' not found in family ' + familyName });
	}

	const userParts = textParts.filter(part => family.chapterDistribution[name].includes(part.id));
	res.json({ userParts, completed: family.completedParts[name] });
});

// Get the status of all parts for a family
app.get('/:familyName/status', (req, res) => {
	const { familyName } = req.params;

	if (!families[familyName]) {
		return res.status(404).json({ error: 'Family not found' });
	}

	const family = families[familyName];
	const status = {};

	Object.keys(family.completedParts).forEach(user => {
		const totalChapters = family.chapterDistribution[user].length;
		const completedChapters = family.completedParts[user];
		status[user] = {
			completed: completedChapters,
			total: totalChapters
		};
	});

	res.json({ status });
});

// Mark a part as completed for a family member
app.post('/:familyName/complete', (req, res) => {
	const { familyName } = req.params;
	const { name, partId } = req.body;

	if (!families[familyName]) {
		return res.status(404).json({ error: 'Family not found' });
	}

	const family = families[familyName];
	if (!family.members.includes(name) || !textParts.some(part => part.id === partId)) {
		return res.status(400).json({ error: 'Invalid user or part ID' });
	}

	if (!family.completedParts[name].includes(partId)) {
		family.completedParts[name].push(partId);
		saveFamilies();
	}

	res.json({ message: 'Part marked as completed', completedParts: family.completedParts });
});

// Get the status of all parts
app.get('/status', (req, res) => {
	res.json({ completedParts, totalParts: chapterDistribution });
});

// Reset all the completed parts function for a specific family
function resetCompletedParts(familyName = null) {
	if (familyName && families[familyName]) {
		// Reset specific family
		const family = families[familyName];
		family.members.forEach(member => {
			family.completedParts[member] = [];
		});
		saveFamilies();
		console.log(`Completed parts reset for family ${familyName} at`, new Date().toLocaleString());
	} else {
		// Reset all families
		Object.keys(families).forEach(familyName => {
			const family = families[familyName];
			family.members.forEach(member => {
				family.completedParts[member] = [];
			});
		});
		saveFamilies();
		console.log('Completed parts reset for all families at', new Date().toLocaleString());
	}
}

// Reset all the completed parts endpoint for a specific family
app.get('/:familyName/resetcompleted', (req, res) => {
	const { familyName } = req.params;

	if (!families[familyName]) {
		return res.status(404).json({ error: 'Family not found' });
	}

	resetCompletedParts(familyName);
	res.json({ message: `All completed parts have been reset for family ${familyName}` });
});

// Add member to family (admin only)
app.post('/api/families/:familyName/members', (req, res) => {
	const { familyName } = req.params;
	const { memberName, adminPassword } = req.body;

	if (!families[familyName]) {
		return res.status(404).json({ error: 'Family not found' });
	}

	if (families[familyName].adminPassword !== adminPassword) {
		return res.status(401).json({ error: 'Invalid admin password' });
	}

	if (families[familyName].members.includes(memberName)) {
		return res.status(400).json({ error: 'Member already exists' });
	}

	families[familyName].members.push(memberName);
	families[familyName].completedParts[memberName] = [];

	// Redistribute chapters with new member
	families[familyName].chapterDistribution = distributeChapters(families[familyName].members);

	// Reset completed parts since chapter distribution changed
	resetCompletedParts(familyName);

	saveFamilies();

	res.json({
		message: 'Member added successfully',
		members: families[familyName].members,
		chapterDistribution: families[familyName].chapterDistribution
	});
});

// Remove member from family (admin only)
app.delete('/api/families/:familyName/members/:memberName', (req, res) => {
	const { familyName, memberName } = req.params;
	const { adminPassword } = req.body;

	if (!families[familyName]) {
		return res.status(404).json({ error: 'Family not found' });
	}

	if (families[familyName].adminPassword !== adminPassword) {
		return res.status(401).json({ error: 'Invalid admin password' });
	}

	const memberIndex = families[familyName].members.indexOf(memberName);
	if (memberIndex === -1) {
		return res.status(404).json({ error: 'Member not found' });
	}

	families[familyName].members.splice(memberIndex, 1);
	delete families[familyName].completedParts[memberName];

	// Redistribute chapters with remaining members
	if (families[familyName].members.length > 0) {
		families[familyName].chapterDistribution = distributeChapters(families[familyName].members);
		resetCompletedParts(familyName);
	}

	saveFamilies();

	res.json({
		message: 'Member removed successfully',
		members: families[familyName].members,
		chapterDistribution: families[familyName].chapterDistribution
	});
});

// Update chapter distribution manually (admin only)
app.put('/api/families/:familyName/chapters', (req, res) => {
	const { familyName } = req.params;
	const { chapterDistribution, adminPassword } = req.body;

	if (!families[familyName]) {
		return res.status(404).json({ error: 'Family not found' });
	}

	if (families[familyName].adminPassword !== adminPassword) {
		return res.status(401).json({ error: 'Invalid admin password' });
	}

	families[familyName].chapterDistribution = chapterDistribution;
	resetCompletedParts(familyName);
	saveFamilies();

	res.json({
		message: 'Chapter distribution updated successfully',
		chapterDistribution: families[familyName].chapterDistribution
	});
});

// Get list of all families (for homepage/selection)
app.get('/api/families', (req, res) => {
	const familyList = Object.keys(families).map(familyName => ({
		name: familyName,
		memberCount: families[familyName].members.length,
		createdAt: families[familyName].createdAt || new Date().toISOString()
	}));

	res.json({ families: familyList });
});

// Set auto completers for a family
app.get('/:familyName/setAutoCompleters', (req, res) => {
	const { familyName } = req.params;

	if (!families[familyName]) {
		return res.status(404).json({ error: 'Family not found' });
	}

	const family = families[familyName];
	let autoCompleters = ['דור', 'חנה', 'סימון', 'עפרה', 'ניתאי', 'אליה', 'יוסף', 'גיא'];

	// Only include auto completers that exist in this family
	autoCompleters = autoCompleters.filter(user => family.members.includes(user));

	autoCompleters.forEach(user => {
		family.completedParts[user] = family.chapterDistribution[user];
	});

	saveFamilies();
	res.json({ message: 'All AutoCompleters marked as completed:' + autoCompleters });
});

// Complete all parts for a user in a family
app.post('/:familyName/completeall', (req, res) => {
	const { familyName } = req.params;
	const { name } = req.body;

	if (!families[familyName]) {
		return res.status(404).json({ error: 'Family not found' });
	}

	const family = families[familyName];
	if (!family.members.includes(name)) {
		return res.status(400).json({ error: 'Invalid user' });
	}

	family.completedParts[name] = family.chapterDistribution[name];
	saveFamilies();

	res.json({ message: 'All Parts marked as completed:' + family.chapterDistribution[name] });
});

// Serve index.html for family URLs (e.g., /gueta/, /cohen/)
app.get('/:familyName/', (req, res) => {
	res.sendFile(path.join(__dirname, 'index.html'));
});

// Schedule automatic reset at 22:00 (10 PM) every day for all families
function scheduleAutomaticReset() {
	const now = new Date();
	const target = new Date();
	target.setHours(22, 0, 0, 0); // Set to 22:00:00.000

	// If it's already past 22:00 today, schedule for tomorrow
	if (now > target) {
		target.setDate(target.getDate() + 1);
	}

	const timeUntilReset = target.getTime() - now.getTime();

	// Set timeout for the first reset
	setTimeout(() => {
		resetCompletedParts(); // Reset all families
		// Then set interval for daily resets (24 hours = 24 * 60 * 60 * 1000 ms)
		setInterval(() => resetCompletedParts(), 24 * 60 * 60 * 1000);
	}, timeUntilReset);

	console.log(`Automatic reset scheduled for all families at ${target.toLocaleString()}`);
}

// Start automatic reset scheduling
scheduleAutomaticReset();


// Start the server
const PORT = 3002;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
