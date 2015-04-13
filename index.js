var JiraApi = require('jira').JiraApi;
var excelbuilder = require('msexcel-builder');


function addLeadingZeros(number, length) {
    var num = '' + number;
    while (num.length < length) num = '0' + num;
    return num;
}

function JiraWorklogs(options) {

    var options = options ? options : {};
    options.protocol = options.protocol ? options.protocol : 'http';
    options.host = options.host ? options.host : 'localhost';
    options.port = options.port ? options.port : 80;
    options.userName = options.userName ? options.userName : '';
    options.password = options.password ? options.password : '';
    options.apiVersion = options.apiVersion ? options.apiVersion : 2;


    this._allWorklogs = [];
    this._from = options.from ? options.from :  new Date("01-01-2000");
    this._to = options.to ? options.to :  new Date("01-01-2100");
    this._userName = options.userName ? options.userName :  null;
    this._projectKey = options.projectKey ? options.projectKey : null;


    this._promiseCount = 0;
    this._jira = new JiraApi(options.protocol, options.host, options.port, options.userName, options.password, options.apiVersion);
    return this;
}


JiraWorklogs.prototype.checkDate = function (date) {
    return date < this._to && date > this._from;
};
JiraWorklogs.prototype.checkUser = function (creator) {
    return creator.key == this._userName;
};
JiraWorklogs.prototype.getFrom = function(){
    return this._from;
};

JiraWorklogs.prototype.getTo = function(){
    return this._to;
};
JiraWorklogs.prototype.getWorklogs = function () {
    return this._allWorklogs.sort(function (a, b) {
        a = a.started;
        b = b.started;
        return a > b ? -1 : a < b ? 1 : 0;
    });
};

JiraWorklogs.prototype.handleWorklog = function (worklog) {
    var dateStr = worklog.started.substr(0, 10);
    var self = this;
    worklog.started = new Date(dateStr);

    //console.log(date.toString(), date < to , date > from)
    if (this.checkDate(worklog.started) && this.checkUser(worklog.author)) {
        self._allWorklogs.push(worklog);
    }
};


JiraWorklogs.prototype.handleIssue = function (issue) {
    var self = this;
    this._jira.getWorklog(issue.id, function (err, data) {
        if (err) {
            throw err;
        }
        var worklogs = data.worklogs;
        worklogs.map(function (item) {
            self.handleWorklog(item)
        });
        self._promiseCount--;
        if (self._promiseCount == 0) {
            console.log("Run finished");
            self._callback(self.getWorklogs());
        }
    })
};

JiraWorklogs.prototype.run = function (callback) {
    console.log("Start export worklog for: " + this._userName + " \n Project: " + this._projectKey + " \n From: "  + this._from  + " \n To: "  + this._to)
    this._callback = callback;
    var self = this;
    this._jira.searchJira("project=" + this._projectKey, {maxResults: 10000}, function (err, result) {
        if(err){
            throw err
        }
        var issues = result.issues;
        issues.map(function (item) {
            self._promiseCount++;
            self.handleIssue(item)
        });

    });
};


JiraWorklogs.prototype.writeXLSX = function(filename, callback){

    // Create a new workbook file in current working-path
    var workbook = excelbuilder.createWorkbook('./', filename + '.xlsx')

    // Create a new worksheet with 10 columns and 12 rows
    var sheet1 = workbook.createSheet('sheet1', 100, 300);

    // Fill some data
    sheet1.set(1, 1, 'Date');
    sheet1.set(2, 1, 'Time');
    sheet1.set(3, 1, 'Comment');
    sheet1.width(3,100);
    var i = 2;
    this.getWorklogs().map(function(item){
        var date = addLeadingZeros(item.started.getDate(),2) + "." + addLeadingZeros((item.started.getMonth()+1),2)  + "." + item.started.getFullYear();
        sheet1.set( 1,i, date);
        sheet1.set( 2,i, item.timeSpent);
        sheet1.wrap(3, i, 'true');
        sheet1.set( 3,i, item.comment);
        sheet1.set( 4,i, item.self);

        i++;
    });

    // Save it
    workbook.save(function(err){
        if (err){
            workbook.cancel();
            callback(err, "Some error")
        }
        else{
            callback(null,"Worklog saved to " + filename + ".xlsx");
        }

    });


};
JiraWorklogs.prototype.writeJSON = function(filename,callback){
    var fs = require('fs');
    var outputFilename = filename + '.json';

    fs.writeFile(outputFilename, JSON.stringify(this.getWorklogs(), null, 4), function(err) {
        if(err) {
            callback(err);
        } else {
            callback(null,"Worklog saved to " + outputFilename );
        }
    });
};


JiraWorklogs.runWithEnvVars = function(){

    if(typeof process.env.jiraHost == 'undefined'){
        return;
    }
    var instance = new JiraWorklogs({
        host:  process.env.host,
        userName: process.env.userName,
        password: process.env.password,
        projectKey: process.env.projectKey,
        from: process.env.from,
        to: process.env.to
    });


    instance.run(function(){
        instance.writeXLSX('exportedData', function(){
            console.log(arguments)
        });

        instance.writeJSON('exportedData',function(){
            console.log(arguments)
        })
    });
};


module.exports = JiraWorklogs;
//JiraWorklogs.runWithEnvVars();
