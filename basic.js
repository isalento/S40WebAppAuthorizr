

var serverURL = "http://authorizr.herokuapp.com";	 
var sid = "";

var params = {			
		 	"auth_endpoint":"https://accounts.google.com/o/oauth2/auth",
		    "token_endpoint":"https://accounts.google.com/o/oauth2/token",
		    "resource_endpoint":"https://www.googleapis.com/oauth2/v1",
		    "scope": "https://www.googleapis.com/auth/drive",
		    "redirect_uri": "http://authorizr.herokuapp.com/login/oauth2callback",
		    "cred_id": "821cb6b483104b7dba53b65b81e76198"     
};

/**
 * Executed on onload
 */
function init(){		
	
	//resetPreferences();
	console.log("!authenticated()"+ !authenticated());	
	if(!authenticated()){				

		console.log("!SIDSet() "+ !SIDSet());
				
		if( !SIDSet() ){
			//On a first run we have to get SID from Authorizr			
			getSID();		
		}else{
			showLoginTwoState();
		}
						
	}else{
		//If we already have tokens stored, we try to use those.		
		showAuthenticatedState();
	}
}

/**
 * Checks if we already have stored token and token_secret
 * @returns {Boolean}
 */
function authenticated(){
	return ( widget.preferences["token"] != "");
}

/**
 * Checks if ID is already received from the server
 * @returns {Boolean}
 */
function SIDSet(){
	return ( widget.preferences["sid"] != "" );
}

/**
 * Resets stored preferences
 */
function resetPreferences(){
	widget.preferences["token"]="";
	widget.preferences["sid"] ="";
}


function showLoginState( ) {
	mwl.show('#login');
	mwl.hide("#logintwo"); //Clicking log in link makes this visible
	mwl.hide("#connect");
	mwl.hide("#logout");
}

function showLoginTwoState( ) {
	mwl.hide('#login');
	mwl.show("#logintwo"); //Clicking log in link makes this visible
	mwl.hide("#connect");
	mwl.hide("#logout");
}


function showAuthenticatedState( ) {	
	mwl.hide('#login');
	mwl.hide('#logintwo');
	mwl.show('#connect');
	mwl.show('#logout');
	
}

function logout(){
	clearFileList();
	resetPreferences();
	init();	
	showLoginState();
}

/**
 * Creates URL encoded string from OAuth configuration. 
 * Configuration is passed to Authorizer to get URL and SID 
 * @returns {String}
 */
function configToURLComponent(){
	
	var query = [];

	for(var key in params) {
		var value = params[key];
		if(value){
			query.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));	
		} 
	}	  
	return query.join("&");		
}


/**
 * Gets SID that is used to distinguish request in server side 
 */
function getSID(){
		
	var authURL = serverURL+"/api/v1/create_session?"+configToURLComponent();	
	
	makeRequest(authURL, 
			function(responseText) {		
							
				var resp = responseText.split("\n");
				
				var sessionid = resp[0].substring(10, resp[0].length);
				var loginURL = resp[1].substring(9, resp[1].length);
				console.log("sid " +sessionid +" url"+ loginURL );
			
				// store SID to preferences
				widget.preferences["sid"] = sessionid;
				console.log("sessionid received: "+ sessionid);
				insertLoginLink(sessionid, loginURL);	
				showLoginState();
			},
			function() {
				resetPreferences();				
			});
}


/**
 * Cliking Log in link is the firts step in log in proces
 * @param id
 */
function insertLoginLink(sid, url) {	
	
	console.log(url);
	document.getElementById("login").innerHTML = "<div onclick=\"mwl.hide('#login');mwl.show('#logintwo');mwl.loadURL('"+url+"');\">Log in</div>";
	
}

/**
 * Step 2 of login process. 
 * Should be automated, but how?
 */
function getAccessToken(){
	
	var url =  serverURL+"/api/v1/fetch_access_token/?sessionid="+widget.preferences["sid"];
	makeRequest(url,
			function(responseText) {
				
				token = responseText;
						
				widget.preferences["token"] = token;
				
				//clear Session ID
				widget.preferences["sid"] = "";
				
				console.log("token: "+ token);
								
				showAuthenticatedState();
				refreshFileList();
			},
			function() {
				logout();
			}
		);	
}




	

/**
 * Gets token and token_secret from the server.
 * These tokens are later used in Web App side to make request to 
 * service provider 
 */

function getCachedAccessToken() {
	return widget.preferences["token"];
}


function refreshFileList(){
	
	if(!authenticated()){
		
	}
	
	var token = getCachedAccessToken();
  	
	var data_url = "https://www.googleapis.com/drive/v2/files?access_token="+encodeURIComponent(token);

	makeRequest(data_url,
			function(responseText){
				var filelist =  JSON.parse(responseText);
				renderFileList(filelist);	
			},
			function(status){
				displayErrorMessage();
				resetPreferences();
				console.log("Oops"+ status);
				logout();
			}
	);
}

function renderFileList(filelist) {	
	var html ="";
	
	console.log(filelist.items);
	
	for(var i=0; i< filelist.items.length; i++){
		html += "<div class='file'><a href='"+filelist.items[i].webContentLink+"'>" +
				"<span class='title'>"+fitStringToWidth(filelist.items[i].title)+"</span></a></div>";
	}
	
	document.getElementById("content").innerHTML = html;
}

function clearFileList() {	
	document.getElementById("content").innerHTML ="";	
}

function displayErrorMessage(message) {
	document.getElementById("content").innerHTML = "Oops Something went wrong.<br>Try to Log-out and in Again <br>"+message;	
}

function writelog(text) {	
	document.getElementById("log").innerHTML += text+"<br>";
}

function fitStringToWidth(string){
	var max_length = (window.innerWidth < 240 ? 25 : 35); 
	
	if(string.length > max_length ){
		return  string.substring(0,max_length)+"...";		
	}	
	return string;
}

function makeRequest(url,successCb,failCb){
		
	console.log("making request to:"+ url);
	
	var req = new XMLHttpRequest();
	req.open("GET", url , true);
	req.onreadystatechange = function(){
		
		if(req.readyState == 4) {			
			if (req.status == 200){	
					 successCb(req.responseText);			
			}else{		
				displayErrorMessage(req.status);
				failCb(req.status);						
			}			
		}		
	};
	req.send("");
}
