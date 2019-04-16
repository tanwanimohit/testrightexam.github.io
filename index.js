//Routing Mechanism - URL Define Here.
const express = require('express');
var ObjectId = require('mongodb').ObjectID;
//Express Only Get Data If Body-Parser Is Worked.
//To Get Value Of Any Control Body-Parser Is Compulsory.
var bodyParser = require('body-parser');

//Node Session and cookies
var cookieParser = require('cookie-parser');
var session = require('express-session');
//var Url = require('url');
//Object Of Express.
const app = express();
app.use(express.static('views'))
//Express Object Uses Body-Parser Object.
app.use(bodyParser.urlencoded({ extended: true }));
//app.use(bodyParser.json());

// initialize cookie-parser to allow us access the cookies stored in the browser. 
app.use(cookieParser());

// initialize express-session to allow us track the logged-in user across sessions.
app.use(session({
    key: 'user_sid',
    secret: 'somerandonstuffs',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 3600000
    }
}));


// This middleware will check if user's cookie is still saved in browser and user is not set, then automatically log the user out.
// This usually happens when you stop your express server after login, your cookie still remains saved in the browser.
app.use((req, res, next) => {
    if (req.cookies.user_sid && !req.session.user) {
        res.clearCookie('user_sid');        
    }
    next();
});


// middleware function to check for logged-in users
var sessionChecker = (req, res, next) => {
    if (req.session.user && req.cookies.user_sid) {
		if(req.session.user.type=="Faculty")
			res.redirect('/Dashboard');
		else
			res.redirect('/StudentDashboard');
    } else {
        next();
    }    
};

var checkFaculty = (req, res, next) => {
    if(req.session.user && req.session.user.type=="Faculty") {
		next();
    } else {
        res.redirect('/login');
    }    
};

var checkStudent = (req, res, next) => {
    if(req.session.user && req.session.user.type=="Student") {
		next();
    } else {
        res.redirect('/login');
    }  
};


//URL Of MongoDB Server.
const url = 'mongodb+srv://testright:Triangle@3@cluster0-grnvl.mongodb.net/test?retryWrites=true';

//Mongo Client Variable
const MongoClient = require('mongodb').MongoClient;
//const uri = "mongodb+srv://testright:<password>@cluster0-grnvl.mongodb.net/test?retryWrites=true";

//Database Name.
const dbName = 'TestRight';

app.get('/', sessionChecker, (req, res) => {
	res.render('homepage');
});
app.get('/login', sessionChecker, (req, res) => {
//	console.log("hello");
	res.render('login');
});

app.get('/register', sessionChecker,(req,res)=>{
	res.render('register');
});

app.get('/RegisterExaminer',(req,res)=>{
	res.render('register');
});

app.get('/TestCreate', checkFaculty ,(req,res)=>{
	if (req.session.user && req.cookies.user_sid) {
		res.render('testcreation_step1');
	}
	else
	{
		 res.redirect('/login');
	}
});
app.get('/exam',(req,res)=>{
	if (req.session.user && req.cookies.user_sid) {
		res.render('exam');
	}
	else
	{
		 res.redirect('/login');
	}
});
app.get('/AddQuestions',checkFaculty,(req,res)=>{
	if (req.session.user && req.cookies.user_sid && req.cookies["id"] && req.session.user.type=="Faculty") {
		MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		console.log("Inside Add Questions \nAdding Data to :- \n");
		const db = client.db(dbName);
		const collection = db.collection('tests');
		var mongo = require('mongodb');
		var id=new mongo.ObjectID(req.cookies["id"]);
		collection.find({_id:id}).toArray(function(err,docs)
		{
			console.log(docs);
			res.render('testcreation_step2',{data:docs});

		});	
		client.close();
		
	});

	}
	else
	{
		 res.redirect('/Dashboard');
	}


});

function testStartTime(testdate, testtime){
	var tdate = testdate.toString().split('-');
	var ttime = testtime.toString().split(':');
	var teststarttime = (new Date(tdate[0], tdate[1]-1, tdate[2], ttime[0], ttime[1])).getTime();
	return teststarttime;
}
function testEndTime(teststarttime, testdur){
	var offset = testdur * 60000;
	var testendtime = teststarttime + offset;
	return testendtime;
}

function canShowCardBlue(testdate, testtime){
	var curtime = (new Date()).getTime();
	var teststarttime = testStartTime(testdate, testtime);
	console.log(curtime + " "+ testStartTime);
	if(curtime < teststarttime)	return true;
	return false;
};

function canBeginTest(testdate, testtime, testdur){
    var date = new Date();
	var curtime = date.getTime();
	var teststarttime = testStartTime(testdate, testtime);
	var testendtime = testEndTime(teststarttime, testdur);
	console.log("Current time: "+curtime+" Test Start Time: "+teststarttime+" Test End Time: "+testendtime);
	if(curtime >= teststarttime && curtime < testendtime){
		return true;
	}
	return false;
}


app.get('/StudentDashboard',(req,res)=>{
	if (req.session.user && req.cookies.user_sid && req.session.user.type=="Student") {
	MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		console.log("Opening Dashboard...");
		res.clearCookie("id");
		const db = client.db(dbName);
		var email=req.session.user.Email;
			var data=[];
			var chk=0;
			console.log(email);
			var d = new Date(),
				month = '' + (d.getMonth() + 1),
				day = '' + d.getDate(),
				year = d.getFullYear();
		
			if (month.length < 2) month = '0' + month;
			if (day.length < 2) day = '0' + day;
		
			var date_1=[year, month, day].join('-');
			console.log(date_1);
			const collection = db.collection('Students');
			const testCollection = db.collection('tests');
			collection.findOne({"Email": email},function(err,docs){
				console.log("initial");
				console.log(docs.RegisteredTests);
				if(docs.RegisteredTests != null){
					var uselessTests = [];
					var count = 0;
					for(j = 0; j<docs.RegisteredTests.length;){	
						if(docs.RegisteredTests[j].status == "Practice"){
							console.log("Cleanup Process "+docs.RegisteredTests[j].test_id);
							uselessTests[count++] = docs.RegisteredTests[j].test_id;
							//delete docs.RegisteredTests[j];
							docs.RegisteredTests.splice(j, 1);
						}else j++;
					}
					console.log("Useless Tests "+uselessTests);
					console.log("CRITICAL STAGE");
					console.log(docs.RegisteredTests);
					testCollection.remove({t_id : {$in : uselessTests}});
					collection.updateOne({"Email" : email}, {$set : {RegisteredTests : docs.RegisteredTests}}, function(err, d1){
						console.log("Database Updation Successful");
						console.log("After Deletion");
						console.log(docs.RegisteredTests);
					});
				}
				data = docs;
				req.session.user = docs;
				req.session.user.type = "Student";
				
				
				var data2=[]; //data to pass the actual test data
				//var data3=[]; //data to pass the boolean if test can start
				var i=0;
				console.log(data);
				var j=0;
				if(data.RegisteredTests!=null)
				{
				for(var i=0; i<data.RegisteredTests.length; i++)
				{
					console.log("run");
					db.collection('tests').findOne({t_id: data.RegisteredTests[i].test_id},
					function(err,docs)
					{
						var canStartTest = canBeginTest(docs.Date, docs.Time, docs.Duration);
						var canTestBlue = canShowCardBlue(docs.Date, docs.Time);
						delete docs.questions;
						for(o = 0; o<data.RegisteredTests.length; o++){
							if(data.RegisteredTests[o].test_id == docs.t_id){
								if(data.RegisteredTests[o].status == "NotAttempted"){
									docs.isAttempted = false;
								}else{
									docs.isAttempted = true;
								}
							}
						}
						docs.canBegin = canStartTest;
						docs.showCardBlue = canTestBlue;
						console.log("Can show card blue "+docs.showCardBlue);
						console.log(docs.t_id+" "+canStartTest);
						data2[j++]=docs;
						console.log(data2[j-1]);
						console.log(j);
						if(j==(data.RegisteredTests.length))
						{
							data2.sort(function(a, b){
								aFinal = 0;
								bFinal = 0;
								aDate = a.Date.toString().split('-');
								aTime = a.Time.toString().split(':');
								bDate = b.Date.toString().split('-');
								bTime = b.Time.toString().split(':');
								aFinal = (new Date(aDate[0], aDate[1], aDate[2], aTime[0], aTime[1]));
								bFinal = (new Date(bDate[0], bDate[1], bDate[2], bTime[0], bTime[1]));
								return bFinal - aFinal;
							});
							res.render('StudentDashboard',{data,data2,date_1});	
						}
						else
						{
							
						}
						
					});
				}
				}
				else
				{
					res.render('StudentDashboard',{data,data2,date_1});	
				}
				
			});	
				
				
	});	
	}
	else
	{
		res.redirect('/login');
	}
});

function compare_date(testdate, testtime, testdur){
    var date = new Date();
	var curtime = date.getTime();
	console.log("Current time: "+curtime+" "+date.getFullYear()+" "+date.getMonth()+" "+date.getDate()+" "+date.getHours()+" "+date.getMinutes())
	var tdate = testdate.toString().split('-');
	var ttime = testtime.toString().split(':');
	//console.log(tdate[0]+" "+tdate[1]+" "+tdate[2]);
	//console.log(ttime[0]+" "+ttime[1]);
	var teststarttime = (new Date(tdate[0], tdate[1]-1, tdate[2], ttime[0], ttime[1])).getTime();
	console.log("Test Start Time "+teststarttime)
	var testendtime = (new Date(tdate[0], tdate[1]-1, tdate[2], ttime[0], ttime[1]+testdur)).getTime();
	console.log("Test End Time "+testendtime)
	if(curtime >= teststarttime && curtime < testendtime){
		return true;
	}
	return false;
}

app.get('/Dashboard',(req,res)=>{
	if (req.session.user && req.cookies.user_sid && req.session.user.type=="Faculty") {
		MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		console.log("Opening Dashboard...");
		res.clearCookie("id");
		const db = client.db(dbName);
		var email=req.session.user.Email;
		
			var data=[];
			console.log(email);
				var d = new Date();
				var date_1=d.getTime();
			db.collection('Examiners').findOne({Email: req.session.user.Email},
				function(err,docs)
				{
					//console.log(docs);
					data=docs;
				});
			
				db.collection('tests').find({Examiner_id: req.session.user.Email}).toArray
				(function(err,docs)
				{
					//console.log(docs);
					res.render('dashboard',{data,data1:docs,date_1});

					console.log(data);
				});
				
		
	});
	}
	else
	{
		 res.redirect('/login');
	}
});


// route for user logout
app.get('/logout', (req, res) => {
    if (req.session.user && req.cookies.user_sid) {
        res.clearCookie('user_sid');
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});



app.post('/RegisterExaminer',(req,res)=>{
	MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		console.log("Registration of Examiner...");

		const db = client.db(dbName);
		const collection = db.collection('Examiners');
		collection.find({Name: req.param('ExmUsrName', null),Email : req.param('ExmUsrEmail', null)}).toArray(function(err,docs)
		{
			console.log("queryyyyyy");
			console.log(docs);
			if(docs.length==0)
			{
				console.log("iffff");
				collection.insertOne(
				{
					Name: req.param('ExmUsrName', null),
					Email : req.param('ExmUsrEmail', null),
					Password : req.param('ExmUsrPass', null),
					/*EmailId : req.param('TxtEmailId', null),
					Password : req.param('TxtPassword', null)*/
				},function(err,result){

					res.redirect('/login');
				});
			}	
			else
			{
				res.render('register');
			}
		});
		


	});

});

app.get('/SaveExaminerProfile',checkFaculty,(req,res)=>{
	if (req.session.user && req.cookies.user_sid && req.session.user.type=="Faculty") {
		
		res.render('register_examiner');
	}
	else
	{
		 res.redirect('/login');
	}
});

app.get('/SaveStudentProfile',checkStudent,(req,res)=>{
	if (req.session.user && req.cookies.user_sid && req.session.user.type=="Student") {
		
		res.render('register_student');
	}
	else
	{
		 res.redirect('/login');
	}
});


app.post('/SubmitTest',checkStudent,(req,res)=>{
	
	//Our Data :- req.body questions results TestID
	var TestID=req.body.TestID;
	var Questions=req.body.questions;
	var Answers=req.body.results;
	
	console.log(TestID);
	MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		console.log("Submiting Test..");
		const db = client.db(dbName);
		const collection = db.collection('tests');
		collection.findOne(
				{t_id: TestID}
				,function(err, result){
				if(err)	throw error;
				db.collection('Results').insertOne(
				{
					Student_Email: req.session.user.Email,
					Test_id: TestID
					
				},
				function(err,docs){
					var counter=0,corr_counter=0;
					console.log("Ref");
					console.log(result);
					for(var i=0; i<result.questions.length; i++)
					{
						for(var j=0; j<result.questions.length; j++)
						{
							if(result.questions[j].question.value==Questions[i])
							{
								//console.log(result.questions[j].question.value);
								//console.log(Questions[i]);
								var Correct=null,Answer=null,Student_Answer="Not Attempted";
								var Question_main=Questions[i];
								
								if(Answers[i]==1)
								{
									if(result.questions[j].question.options.A.correct=="on")
									{
										correct=true;
										corr_counter++;
										Answer=result.questions[j].question.options.A.value;
										Student_Answer=result.questions[j].question.options.A.value;
									}
									else
									{
										correct=false;
										Student_Answer=result.questions[j].question.options.A.value;
									}
								}
								else if(Answers[i]==2)
								{
									if(result.questions[j].question.options.B.correct=="on")
									{
										correct=true;
										corr_counter++;
										Answer=result.questions[j].question.options.B.value;
										Student_Answer=result.questions[j].question.options.B.value;
									}
									else
									{
										correct=false;
										Student_Answer=result.questions[j].question.options.B.value;
									}
								}
								else if(Answers[i]==3)
								{
									if(result.questions[j].question.options.C.correct=="on")
									{
										correct=true;
										corr_counter++;
										Answer=result.questions[j].question.options.C.value;
										Student_Answer=result.questions[j].question.options.C.value;
									}
									else
									{
										correct=false;
										Student_Answer=result.questions[j].question.options.C.value;
									}
								}
								else if(Answers[i]==4)
								{
									if(result.questions[j].question.options.D.correct=="on")
									{
										correct=true;
										corr_counter++;
										Answer=result.questions[j].question.options.D.value;
										Student_Answer=result.questions[j].question.options.D.value;
									}
									else
									{
										correct=false;
										Student_Answer=result.questions[j].question.options.D.value;
									}
								}
								else
								{
									correct=false;
									counter++;
								}
								
								if(correct==false)
								{
									if(result.questions[j].question.options.A.correct=="on")
									{
										Answer=result.questions[j].question.options.A.value;
									}
									else if(result.questions[j].question.options.B.correct=="on")
									{
										Answer=result.questions[j].question.options.B.value;
									}
									else if(result.questions[j].question.options.C.correct=="on")
									{
										Answer=result.questions[j].question.options.C.value;
									}
									else if(result.questions[j].question.options.D.correct=="on")
									{
										Answer=result.questions[j].question.options.D.value;
									}
									else
									{
										Answer="Nothing!"
									}
								}
								
								
								db.collection('Results').updateOne(
								{
									Student_Email: req.session.user.Email,
									Test_id: TestID
									
								},
								
								{$push:{
									Result:
									{
										question:Question_main,
										StudentAnswer: Student_Answer,
										ActualAnswer: Answer,
										Correct:correct
									}
								}},
								
								function(err,docs){
									var AttemptedQuestion=result.questions.length-counter;
									var percentage=(corr_counter/result.questions.length)*100;
									
									db.collection('Results').updateOne(
									{
										Student_Email: req.session.user.Email,
										Test_id: TestID
									},
									
									{$set:{
										Attempted:AttemptedQuestion,
										Percentage:percentage
									}},
									
									function(err,docs){
										console.log('now status');
										db.collection('Students').findOne({ Email: req.session.user.Email},function(err,docs1){
											console.log("Trying to edit");
											console.log(docs1);
											console.log(docs1.RegisteredTests[0]);
											for(i = 0; i<docs1.RegisteredTests.length; i++){
												if(docs1.RegisteredTests[i].test_id == TestID && docs1.RegisteredTests[i].status == "NotAttempted"){
													db.collection('Students').updateOne({Email: req.session.user.Email, "RegisteredTests.test_id":TestID},
													{$set : {"RegisteredTests.$.status" : "Attempted"}, function(err, rx){
													}}
													);
												}
											}
										});
									}
								);

								}
							);
								break;
							}
						}
					}
					
					
				});
				}
			);
			res.send("Done");
	});
});


app.post('/SaveExaminerProfile',checkFaculty,(req,res)=>{
	MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		console.log("Edit Profile of Examiner...");
		const db = client.db(dbName);
		const collection = db.collection('Examiners');
		var mongo = require('mongodb');
		var id=new mongo.ObjectID(req.session.user._id);
		console.log(req.session.user._id);
		collection.updateOne(
				{_id: id},
				{$set:{
					InstituteName: req.param('InstName', null),
					InstituteType: req.param('insttype', null),
					InstituteAddress: req.param('Address', null),
					InstituteCountry: req.param('conttype', null),
					ExaminerContact: req.param('Contact',null)
				}}
			, function(err, result){
				if(err)	throw error;
			});
		res.redirect('/Dashboard');
	});

});

app.get('/EditExaminerProfile',(req,res)=>{
	if (req.session.user && req.cookies.user_sid && req.session.user.type=="Faculty") {
		MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
			console.log("Edit Profile of Examiner...");
			const db = client.db(dbName);
			const collection = db.collection('Examiners');
			var mongo = require('mongodb');
			var id=new mongo.ObjectID(req.session.user._id);
			console.log(req.session.user._id);
			collection.findOne({_id:id},
				function(err,docs)
				{
					console.log(docs);
					res.render('EditExaminerProfile',{data:docs});
				});
		});
	}
	else
	{
		 res.redirect('/login');
	}
});

app.post('/EditExaminerProfile',(req,res)=>{
	MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		console.log("Edit Profile of Examiner...");
		const db = client.db(dbName);
		const collection = db.collection('Examiners');
		var mongo = require('mongodb');
		var id=new mongo.ObjectID(req.session.user._id);
		console.log(req.session.user._id);
		collection.updateOne(
				{_id: id},
				{$set:{
					Name: req.param('ExmName',null),
					InstituteName: req.param('InstName', null),
					InstituteType: req.param('insttype', null),
					InstituteAddress: req.param('Address', null),
					InstituteCountry: req.param('conttype', null),
					ExaminerContact: req.param('Contact',null),
					Password: req.param('ExmPass',null)
				}}
			, function(err, result){
				if(err)	throw error;
			});
		res.redirect('/Dashboard');
	});

});
app.post('/SaveStudentProfile',checkStudent,(req,res)=>{
	MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		console.log("Edit Profile of Student...");
		const db = client.db(dbName);
		const collection = db.collection('Students');
		var mongo = require('mongodb');
		var id=new mongo.ObjectID(req.session.user._id);
		console.log(req.session.user._id);
		collection.updateOne(
				{_id: id},
				{$set:{
					InstituteName: req.param('stdinstname', null),
					InstituteType: req.param('stdinsttype', null),
					InstituteAddress: req.param('stdadress', null),
					InstituteCountry: req.param('stdconttype', null),
					StudentContact: req.param('StuContact',null)
				}}
			, function(err, result){
				if(err)	throw error;
			});
		res.redirect('/StudentDashboard');
	});

});
app.get('/EditStudentProfile',(req,res)=>{
	if (req.session.user && req.cookies.user_sid && req.session.user.type=="Student") {
		MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
			console.log("Edit Profile of Student...");
			const db = client.db(dbName);
			const collection = db.collection('Students');
			var mongo = require('mongodb');
			var id=new mongo.ObjectID(req.session.user._id);
			console.log(req.session.user._id);
			collection.findOne({_id:id},
				function(err,docs)
				{
					console.log(docs);
					res.render('EditStudentProfile',{data:docs});
				});
		});
	}
	else
	{
		 res.redirect('/login');
	}
});

app.post('/EditStudentProfile',(req,res)=>{
	MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		console.log("Edit Profile of Student...");
		const db = client.db(dbName);
		const collection = db.collection('Students');
		var mongo = require('mongodb');
		var id=new mongo.ObjectID(req.session.user._id);
		console.log(req.session.user._id);
		collection.updateOne(
				{_id: id},
				{$set:{
					Name: req.param('StdName',null),
					InstituteName: req.param('stdinstname', null),
					InstituteType: req.param('stdinsttype', null),
					InstituteAddress: req.param('stdadress', null),
					InstituteCountry: req.param('stdconttype', null),
					ExaminerContact: req.param('StuContact',null),
					Password: req.param('StdPass',null)
				}}
			, function(err, result){
				if(err)	throw error;
			});
		res.redirect('/Dashboard');
	});

});

app.post('/RegisterTest',(req,res)=>{
	console.log("Registering Test id...");
	MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		console.log("inside register test");
		const db = client.db(dbName);
		const collection = db.collection('Students');
		var mongo = require('mongodb');
		var id=new mongo.ObjectID(req.session.user._id);
		console.log(req.session.user._id);
		collection.find({_id:id,RegisteredTests:{test_id:req.param('examid',null)}}).toArray(function(err,docs)
		{
			console.log("queryyyyyy");
			console.log(docs);
			if(docs.length==0)
			{
				console.log("iffff");
				collection.updateOne(
							{_id: id},
							{$push:{
								RegisteredTests:
								{
									test_id:req.param('examid',null),
									status:"NotAttempted"
								}
							}}
						, function(err, result){
							if(err)	throw error;
							res.redirect('/StudentDashboard');
						});
			}
			else
			{
				res.redirect('/StudentDashboard');
			}
		});
		//res.redirect('/StudentDashboard');
	});

});

app.post('/AddQuestionRedirect',(req,res)=>{
	res.cookie("id",req.param('test_id',null));
	console.log(req.param('test_id',null));
	res.redirect('/AddEditQuestions');
});

app.post('/ExamResult',(req,res)=>{
	var TestID=req.param('ExamId',null);
	console.log("Exam Results Faculty Side..");
	MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		const db = client.db(dbName);
		db.collection('Results').find({Test_id: TestID}).toArray(
				function(err,docs)
				{
					console.log(docs);
					res.render('ExamResult',{data:docs,TestId:TestID});
				});
		
	});
	
});

app.post('/Result',(req,res)=>{
	var TestID=req.param('ExamId',null);
	var EmailID=req.session.user.Email;
	if(req.session.user.type=="Faculty")
	{
		EmailID=req.param('Email',null);
	}
	console.log("Getting Result");
	if(TestID==null)
	{
		console.log("No Result");
		res.redirect("/StudentDashboard");
	}
	MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		const db = client.db(dbName);
		db.collection('Results').findOne(
		{
			Student_Email: EmailID,
			Test_id: TestID
		},
		
		function(err,docs){
			if(docs!=null) res.render('Result',{data:docs});
			else{ res.redirect("/StudentDashboard"); }
		}
		);
		
	});
});






//Will delete this later For testing perpose only...
app.get('/Result',(req,res)=>{
	MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		const db = client.db(dbName);
		db.collection('Results').findOne(
		{
			Student_Email: req.session.user.Email,
			Test_id: 'HT674'
		},
		
		function(err,docs){
			res.render('Result',{data:docs});
		}
		);
		
	});

});


app.get('/AddEditQuestions',(req,res)=>{
	if (req.session.user && req.cookies.user_sid && req.cookies["id"] && req.session.user.type=="Faculty") {
		MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		console.log("Inside Add Edit Questions \n Editing Data to :- \n");
		const db = client.db(dbName);
		const collection = db.collection('tests');
		var mongo = require('mongodb');
		var id=new mongo.ObjectID(req.cookies["id"]);
		collection.find({_id:id}).toArray(function(err,docs)
		{
			console.log(docs);
			res.render('AddEditQuestions',{data:docs});
			
		});	
		client.close();
		
	});

	}
	else
	{
		 res.redirect('/Dashboard');
	}


});

app.post('/EditTestRedirect',(req,res)=>{
	res.cookie("id",req.param('test_id',null));
	console.log(req.param('test_id',null));
	res.redirect('/EditTestDetails');
});


app.get('/EditTestDetails',(req,res)=>{
	if (req.session.user && req.cookies.user_sid && req.cookies["id"] && req.session.user.type=="Faculty") {
		MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		console.log("Inside Display Test Details \n Editing Data to :- \n");
		const db = client.db(dbName);
		const collection = db.collection('tests');
		var mongo = require('mongodb');
		var id=new mongo.ObjectID(req.cookies["id"]);
		collection.findOne({_id:id},
			function(err,docs)
			{
				console.log(docs);
				res.render('Edit_TestDetails',{docs});
			});
		client.close();
		
	});

	}
	else
	{
		 res.redirect('/Dashboard');
	}


});

app.post('/StartTest',(req,res)=>{
	var TestID=req.param('ExamId',null);
	
	res.render('StartTest',{data:TestID});
	
});

app.post('/EditTestDetails',(req,res)=>{
	MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		console.log("Edit Test Details...");
		const db = client.db(dbName);
		const collection = db.collection('tests');
		var mongo = require('mongodb');
		var id=new mongo.ObjectID(req.cookies["id"]);
		collection.updateOne(
				{_id: id},
				{$set:{
					Test_title: req.param('TestTitle', null),
					Subject: req.param('TestSubject', null),
					Date: req.param('TestDate', null),
					Time: req.param('TestTime', null),
					Duration: req.param('TestDuration',null),
					tags: req.param('TestTags',null),
					private: req.param('TestType',null)
				}}
			, function(err, result){
				if(err)	throw error;
			});
		res.redirect('/Dashboard');
	});

});

app.post('/AddEditQuestions',(req,res)=>{

	MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		console.log("Inside Adding Questions");
		const db = client.db(dbName);
		const collection = db.collection('tests');
		var mongo = require('mongodb');
		var id=new mongo.ObjectID(req.cookies["id"]);
		var qns=parseInt(req.query.qns);
		//var qns=2;
		console.log(qns);
		console.log(id);
		console.log(req.cookies["id"]);
		collection.updateOne({_id:id},{$set:{questions:[]}},function(err,affected){ 
		//console.log('affected: ', affected);
		});
		for(var i=0;i<=qns;i++)
		{
			console.log("Loop Started");
			var yop='question_'+i;
			var finals=yop.concat(i);
			var select =req.param('Eselect_'+i, null);
			console.log("Adding Question with options "+select);
			if(select==null)
			{
				continue;
			}
			else if(select==2)
			{

				collection.updateOne({_id:id}, {$push:{

					questions:
					{
						question:
						{
							type:"o2",

							value:req.param('Equestion_'+i, null),
							options:
							{
								A:
								{
									value:req.param('Eoption_1_'+i, null),
									correct:req.param('EACorrect_'+i, null)
								},
								B:
								{
									value:req.param('Eoption_2_'+i, null),
									correct:req.param('EBCorrect_'+i, null)
								}
							}
						}
					}

				}});
			}
			else
			{
				collection.updateOne({_id:id}, {$push:{

					questions:
					{
						question:
						{

							type:"o4",
							value:req.param('Equestion_'+i, null),
							options:
							{
								A:
								{
									value:req.param('Eoption_1_'+i, null),
									correct:req.param('EACorrect_'+i, null)
								},
								B:
								{
									value:req.param('Eoption_2_'+i, null),
									correct:req.param('EBCorrect_'+i, null)
								},
								C:
								{
									value:req.param('Eoption_3_'+i, null),
									correct:req.param('ECCorrect_'+i, null)
								},
								D:
								{
									value:req.param('Eoption_4_'+i, null),
									correct:req.param('EDCorrect_'+i, null)
								}
							}
						}
					}

				}});
			}
		}

		console.log("Questions Added redirected to Dashboard !!");
		res.redirect('/Dashboard');
		//res.clearCookie("id");

		client.close();
	});

});

function createTestId(testtitle){
	var newid = testtitle.trim().substring(0,2).toUpperCase();
	var seed = (new Date()).getTime();
	var l = seed.toString().length;
	var s = seed.toString().substring(l-3, l+1);
	newid = newid + s;
	//console.log("just created "+newid);
	return newid;
}

function splitTags(tags){
	if (tags == null)
		return null;
	var tags = tags.toString().split(',');
	return tags;
}

app.post('/TestCreate',checkFaculty,(req,res)=>{
	MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		console.log("Inside test Creation...");

		const db = client.db(dbName);
		const collection = db.collection('tests');
		const openBankCollection = db.collection('OpenBank');
		collection.insertOne(
			{
				//Name: req.param('ExmUsrName', null),
				Examiner_id:req.session.user.Email,
				Test_title:req.param('TestTitle', null),
				t_id:createTestId(req.param('TestTitle', "Title")),
				Subject:req.param('TestSubject', null),
				Date:req.param('TestDate', null),
				Time:req.param('TestTime', null),
				Duration:req.param('TestDuration', null),
				tags:req.param('TestTags', null),
				private:req.param('TestType', null)
				/*"questions":{
					"question":{"value":"What is Html ?",
					"options":{
						"A":{
							"value":"Something",
							"correct":false
							},
						"B":{
							"value":"More",
							"correct":true
							}
						}
					}
				}*/


			},function(err,result){
				//console.log("Result "+result.insertedId+" "+result.t_id);
				res.cookie("id",result.insertedId);
				testtags = splitTags(req.param('TestTags', null));
				if(testtags != null && result != null){
					console.log("Start Pushing Tags into OpenBank");
					for(i = 0; i<testtags.length; i++){
						openBankCollection.updateOne({"tag" : testtags[i]},
						{$push : {"List" : result.insertedId}},
						{upsert : true}
						);
					}	
				console.log("Closing OpenBank updation");
				}
				res.redirect('/AddQuestions');
		});
		//Insert into OpenBank Here
		
		collection.find({}).toArray(function(err,docs)
		{
			//console.log(docs);
		});

	});

});


app.get('/LoginExaminer', sessionChecker,(req,res)=>{
	res.clearCookie("id");
	res.render('login');
});

app.post('/LoginExaminer',(req,res)=>{
	MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		console.log("Trying to Login");
		
		const db = client.db(dbName);
		
		db.collection('Examiners').findOne({
				$and:
				[	
					{Email : req.param('ExmUsrEmail', null)},
					{Password : req.param('ExmUsrPass', null)}
				]
				
			}, function(err, user) {
             if(user ===null){
               res.end("Login invalid");
			   console.log("Login Invaild");
            } else {
            
			req.session.user = user;
			req.session.user.type = "Faculty";
			console.log(req.session.user);
			/*var email=req.param('ExmUsrEmail',null);
			var data=[];
			console.log(email);
				var d = new Date(),
					month = '' + (d.getMonth() + 1),
					day = '' + d.getDate(),
					year = d.getFullYear();
			
				if (month.length < 2) month = '0' + month;
				if (day.length < 2) day = '0' + day;
			
				var date_1=[year, month, day].join('-');
				console.log(date_1);
			
			db.collection('Examiners').findOne({Email: req.param('ExmUsrEmail',null)},
				function(err,docs)
				{
					console.log(docs);
					data=docs;
				});
			
				db.collection('tests').find({Examiner_id: req.param('ExmUsrEmail',null)}).toArray
				(function(err,docs)
				{
					console.log(docs);
					res.render('dashboard',{data,data1:docs,date_1});
				});
			//res.render('dashboard',{email});*/
			res.redirect('/Dashboard');
          }
	});
			
	});

});
app.get('/RegisterStudent',(req,res)=>{
	res.render('register');
});

app.post('/RegisterStudent',(req,res)=>{
	MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		console.log("Inside Registration of Student..");

		const db = client.db(dbName);
		const collection = db.collection('Students');
		collection.find({Name: req.param('StdUsrName', null),Email : req.param('StdUsrEmail', null)}).toArray(function(err,docs)
		{
			console.log("queryyyyyy");
			console.log(docs);
			if(docs.length==0)
			{
				console.log("iffff");
				collection.insertOne(
				{
					Name: req.param('StdUsrName', null),
					Email : req.param('StdUsrEmail', null),
					Password : req.param('StdUsrPass', null),

				},function(err,result){
					res.redirect('/StudentDashboard');
				});
			}	
			else
			{
				res.render('register');
			}
		});
		


	});

});
app.get('/LoginStudent',(req,res)=>{
	res.render('login');
});

app.post('/LoginStudent',(req,res)=>{
	MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		console.log("Trying to Login...");

		const db = client.db(dbName);

		db.collection('Students').findOne({
				$and:
				[	
					{Email : req.param('StdUsrEmail', null)},
					{Password : req.param('StdUsrPass', null)}
				]

			}, function(err, user) {
             if(user ===null){
               res.end("Login invalid");
			   console.log("Login Invaild");
            } else {
				req.session.user = user;
			req.session.user.type = "Student";
			console.log(req.session.user);
            console.log(req.session.user.type);
            res.redirect('StudentDashboard');
          }
	});

	});

});




app.get('/MemberRecordsExaminers',(req,res)=>{
	MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		console.log("Printing Data of Member Records Examiners");

		const db = client.db(dbName);
		const collection = db.collection('Examiners');
		collection.find({}).toArray(function(err,docs)
		{
			console.log(docs);
			res.render('MemberRecordsExaminers',{data:docs});

		});	
		client.close();
	});
});


app.get('/ExamInAction',checkStudent,(req,res)=>{
    MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
        let ExamId = req.query.ExamId.trim();
        console.log(ExamId);
		var mongo = require('mongodb');
		//var id = new mongo.ObjectId(ExamId);
        const db = client.db(dbName);
        const collection = db.collection('tests');
		console.log(req.session.user);
		db.collection('Students').find({Email : req.session.user.Email,RegisteredTests:{test_id:ExamId,status:"Attempted"}}).toArray(function(err,docs)
		{
			console.log("queryyyyyy");
			console.log(docs);
			if(docs.length==0)
			{
				console.log("iffff");
				collection.find({"t_id": ExamId}).toArray((err,docs1)=>{
				docs1[0].questions.forEach(element => {
					if(element.question.type == "o4")
					{
						delete element.question.options.A.correct;
						delete element.question.options.B.correct;
						delete element.question.options.C.correct;
						delete element.question.options.D.correct;
					}
					else if(element.question.type == "o2")
					{
						delete element.question.options.A.correct;
						delete element.question.options.B.correct;
					}
				});
				let Q_list = docs1[0].questions;
				delete docs1[0].questions;
				let exam_info = docs1[0];
				let ExamData = {
					info : exam_info,
					Questions : Q_list
				};
            //console.log(ExamData);
					var currentIndex = ExamData.Questions.length, temporaryValue, randomIndex;
					while (0 !== currentIndex) 
					{
						randomIndex = Math.floor(Math.random() * currentIndex);
						currentIndex -= 1;
						temporaryValue = ExamData.Questions[currentIndex];
						ExamData.Questions[currentIndex] = ExamData.Questions[randomIndex];
						ExamData.Questions[randomIndex] = temporaryValue;
					}
					res.render('exam',{data:ExamData})
				});
			}	
			else
			{
				res.redirect('/StudentDashboard');
			}
		});
        
    });
	
});

app.post('/getExam',(req,res)=>{
	MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		//console.log("Printing Data of Member Records Students");
		
		const db = client.db(dbName);
		const collection = db.collection('tests');
		collection.find({"_id" : ObjectId('5cad023b7c41c361c5fdddc5')}).toArray(function(err,docs)
		{
		// 	app.use(bodyParser.urlencoded({ extended: false }));
		// 	app.use(bodyParser.json()); 
		// let some = docs[0].questions[0].question.options
		// delete some.A.correct;

		docs[0].questions.forEach(element => {
			if(element.question.type == "o4")
			{
				delete element.question.options.A.correct
				delete element.question.options.B.correct
				delete element.question.options.C.correct
				delete element.question.options.D.correct
			}
			else if(element.question.type == "o2")
			{
				delete element.question.options.A.correct
				delete element.question.options.B.correct				
			}
		});
			
			res.json(docs[0])

		});	
		client.close();
	});
});


app.get('/MemberRecordsStudents',(req,res)=>{
	MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		console.log("Printing Data of Member Records Students");

		const db = client.db(dbName);
		const collection = db.collection('Students');
		collection.find({}).toArray(function(err,docs)
		{
			console.log(docs);
			res.render('MemberRecordsStudents',{data:docs});

		});	
		client.close();
	});
})


app.get('/showtests',(req,res)=>{
	MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		console.log("Showing tests");

		const db = client.db(dbName);
		const collection = db.collection('tests');
		collection.find().toArray(function(err,docs)
		{
			console.log(docs);
		});	
		client.close();
	});
})

function sortFewQuestions(ques, numberOfQues){
	var questionBank = [];
	count = 0; 
	while(count < numberOfQues){
		var rand = Math.floor(Math.random() * ques.length);
		questionBank[count++] = ques[rand];
	}
	return questionBank;
}

function finalQuestionBank(ques){
	var questionbank = [];
	var count = 0;
	for(j = 0; j<ques.length; j++){
		for(k = 0; k<ques[j].questions.length; k++){
			questionbank[count++] = ques[j].questions[k];
		}
	}
	return questionbank;
}

function fetchTestsByTags(userid, testid, res, testtags, numberOfQues){
	MongoClient.connect(url, {useNewUrlParser: true}, function(err, client){
		const db = client.db(dbName);
		const openBankCollection = db.collection('OpenBank');
		const testCollection = db.collection('tests');
		const studentCollection = db.collection('Students');
		var questionBank;
		var mongo = require('mongodb');
		var id=userid;
		openBankCollection.find({"tag" : { $in : testtags}}).toArray(function(err, docs){
			console.log("Logging from fetchTestsByTags");
			console.log(docs);
			if(docs!=null){
				var bankids = [];
				var count = 0;
				for(i = 0; i<docs.length; i++){
					for(j = 0; j<docs[i].List.length; j++){
						bankids[count++] = docs[i].List[j]; 
					}
				}
				console.log("Successfully fetched test ids."); 
				console.log(bankids);
				testCollection.find({_id : {$in : bankids}}).toArray(function(err, ques){
					console.log(ques);
					questionBank = finalQuestionBank(ques);
					questionBank = sortFewQuestions(questionBank, numberOfQues);
					console.log("Final Question Bank");
					console.log(questionBank);
					testCollection.updateOne(
						{_id:testid},
						{$set : {questions : questionBank}}
						).then(result => {
							console.log("Practice Test Created Successfully.");
							//Register for Test
							testCollection.findOne({_id:testid}, function(err, foundTest){
								var tid = foundTest.t_id;
								console.log("Registering "+tid+" for "+id);
								studentCollection.updateOne({_id : id},
									{$push : {
										RegisteredTests :
										{
											test_id : tid,
											status : "Practice"
										}
									}}
									).then(result1 => {
										console.log("Register successful");
										//Start Test
										res.render('StartTest',{data:tid});
									});
							});
							
						});
				});
			}
		});
		client.close;
	});
	return null;
}

app.post('/PracticeTest', checkStudent, (req, res)=>{
	MongoClient.connect(url, {useNewUrlParser: true}, function(err, client){
		console.log("Inside Practice Test Creation");
		const db = client.db(dbName);
		const testsCollection = db.collection('tests');
		var mongo = require('mongodb');
		var id = new mongo.ObjectID(req.session.user._id);
		var practiceexaminerid = new mongo.ObjectID("5cb4d69b1c9d44000051e434");
		testsCollection.insertOne({
			Examiner_id:practiceexaminerid,
			Test_title:req.param('practicetags',null),
			t_id:createTestId(req.param('practicetags', "Title")),
			Subject:req.param('practicetags',null),
			Date:(new Date()),
			Time:(new Date()),
			Duration:"20",
			tags:null,
			private:"Close"
		},function(err, result){
			console.log("PracticeTest Step 1 Complete.");
			res.cookie("id", result.insertedId);
			var testtags = splitTags(req.param('practicetags', null));
			console.log("Test tags: "+testtags[0]+" "+testtags[1]+" ... "+testtags);
			if(testtags != null){
				numberOfQues = 5;
				fetchTestsByTags(id, result.insertedId, res, testtags, numberOfQues);
			}
		}
		);
	});
});

app.post('/AddQuestions',checkFaculty,(req,res)=>{

	MongoClient.connect(url,{ useNewUrlParser: true },function(err,client){
		console.log("Inside Adding Questions");
		//var yo=
		//console.log(req.param('question_0', null));
		const db = client.db(dbName);
		const collection = db.collection('tests');
		var mongo = require('mongodb');
		var id=new mongo.ObjectID(req.cookies["id"]);
		var qns=parseInt(req.query.qns);
		//var qns=2;
		console.log(qns);
		console.log(id);
		console.log(req.cookies["id"]);
		for(var i=0;i<=qns;i++)
		{
			console.log("Loop Started");
			var yop='question_'+i;
			var finals=yop.concat(i);
			var select =req.param('select_'+i, null);
			console.log("Adding Question with options "+select);
			if(select==null)
			{
				continue;
			}
			else if(select==2)
			{

				collection.updateOne({_id:id}, {$push:{

					questions:
					{
						question:
						{
							type:"o2",

							value:req.param('question_'+i, null),
							options:
							{
								A:
								{
									value:req.param('option_1_'+i, null),
									correct:req.param('ACorrect_'+i, null)
								},
								B:
								{
									value:req.param('option_2_'+i, null),
									correct:req.param('BCorrect_'+i, null)
								}
							}
						}
					}

				}});
			}
			else
			{
				collection.updateOne({_id:id}, {$push:{

					questions:
					{
						question:
						{

							type:"o4",
							value:req.param('question_'+i, null),
							options:
							{
								A:
								{
									value:req.param('option_1_'+i, null),
									correct:req.param('ACorrect_'+i, null)
								},
								B:
								{
									value:req.param('option_2_'+i, null),
									correct:req.param('BCorrect_'+i, null)
								},
								C:
								{
									value:req.param('option_3_'+i, null),
									correct:req.param('CCorrect_'+i, null)
								},
								D:
								{
									value:req.param('option_4_'+i, null),
									correct:req.param('DCorrect_'+i, null)
								}
							}
						}
					}

				}});
			}
		}

		console.log("Questions Added redirected to Dashboard !!");
		res.redirect('/Dashboard');
		//res.clearCookie("id");

		client.close();
	});

});





//Httpserver Port Number 3000.

app.listen(process.env.PORT || 3000, function(){
  console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});

//Set The File Type To App As EJS.
app.set('view engine', 'ejs');