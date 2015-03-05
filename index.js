JiraApi = require('jira').JiraApi;
csv = require('fast-csv');
fs = require('fs');
function addLeadingZeros(number, length) {
    var num = '' + number;
    while (num.length < length) num = '0' + num;
    return num;
}

function JiraWorklogs(connectionOptions, projectKey, from, to, userName) {
    this._allWorklogs = [];
    this._from = from;
    this._to = to;
    this._userName = userName;
    this._projectKey = projectKey;
    this._promiseCount = 0;

    var connectionOptions = connectionOptions ? connectionOptions : {};
    connectionOptions.protocol = connectionOptions.protocol ? connectionOptions.protocol : 'http';
    connectionOptions.host = connectionOptions.host ? connectionOptions.host : 'localhost';
    connectionOptions.port = connectionOptions.port ? connectionOptions.port : 80;
    connectionOptions.userName = connectionOptions.userName ? connectionOptions.userName : '';
    connectionOptions.password = connectionOptions.password ? connectionOptions.password : '';
    connectionOptions.apiVersion = connectionOptions.apiVersion ? connectionOptions.apiVersion : 2;


    this._jira = new JiraApi(connectionOptions.protocol, connectionOptions.host, connectionOptions.port, connectionOptions.userName, connectionOptions.password, connectionOptions.apiVersion);
}


JiraWorklogs.prototype.checkDate = function (date) {
    return date < this._to && date > this._from;
};
JiraWorklogs.prototype.checkUser = function (creator) {
    return creator.key == this._userName;
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
            self._callback(self.getWorklogs());
        }
    })
};

JiraWorklogs.prototype.run = function (callback) {
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


JiraWorklogs.prototype.writeCSV = function(filename, callback){
    var csvStream = csv.createWriteStream({headers: true}),
        writableStream = fs.createWriteStream(filename+".csv");

    writableStream.on("finish", function(){

        callback('Done');
    });

    csvStream.pipe(writableStream);

    this.getWorklogs().map(function(item){

        var comment = item.comment ? item.comment : '';
        comment = comment.replace( new RegExp('\n', 'g'),'');
        comment = comment.replace( new RegExp('\r', 'g'),'');

        var date = addLeadingZeros(item.started.getDate(),2) + "." + addLeadingZeros((item.started.getMonth()+1),2)  + "." + item.started.getFullYear();
        csvStream.write(
                        {
                            date: date,
                            spentTime: item.timeSpent,
                            comment: ' ' +comment
                        }
                        );
    });
    csvStream.end();

}

var instance = new JiraWorklogs({
    host:  process.env.jiraHost,
    userName: process.env.jiraUserName,
    password: process.env.jiraUserPassword
}, process.env.jiraProjectKey,
    new Date("01-01-2015"),
    new Date("02-28-2015"),
    process.env.jiraUserName);


instance.run(function(){
    console.log("Load finished");
    instance.writeCSV('test', function(){
        console.log(arguments)
    })
});

