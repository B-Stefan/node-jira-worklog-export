# node-jira-worklog-export
Get all worklogs by user and date rage and export this data to json or excel file 

#Use

1. npm install node-jira-worklog-export
2. Set up your script 

```javascript 

    var JiraWorklog = require("node-jira-worklog-export");
    
    var options = {
        host:  'jira.example.de',
        userName: 'your',
        password: 'your',
        projectKey: 'KEY',
        from: '01-01-2015',
        to: '12-31-2015'
    }
    var instance = new JiraWorklog(options);
    
    
    instance.run(function(){
        console.log("Load finished");
        instance.writeXLSX('yourData', function(){
            console.log(arguments)
        });
    
        instance.writeJSON('yourData',function(){
            console.log(arguments)
        })
    });


```

##Options

* host:  your jira host 'jira.example.de'
* userName: your username for jira 
* password: your password for jira user 
* projectKey: your jira project key
* from: 'MM-DD-YYYY'
* to: 'MM-DD-YYYY'


##Example CLI 
set up options as env vars 
```
    node index.js 
```
