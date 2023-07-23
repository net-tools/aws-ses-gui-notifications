'use strict';


// namespace
window.nettools = window['nettools'] || {};



/**
 * Constructor of JS frontend class to query and display AWS SES notifications
 * 
 * @param string nodeId Id of DOM node to put content into
 * @param string type Kind of message to process ('Delivery' or 'Bounce')
 * @param string tableClassList CSS classname to set for the table to be created inside nodeId DOM item
 */
nettools.awsSesGuiNotifications = function(nodeId, type, tableClassList)
{
	this.nodeId = nodeId;
	this.type = type;
    this.tableClassList = tableClassList;
	this.data = {
		ts : null,
		lst : [],
        count : 0
	};
    
    
    this.initialize();
}



nettools.awsSesGuiNotifications.prototype.i18n = {
    timestamp : 'Time',
    //type : 'Type',
    recipient : 'Recipient',
    subject : 'Subject'
};


nettools.awsSesGuiNotifications.prototype.i18n.delivery = {
    smtpResponse : 'Response of SMTP'
};


nettools.awsSesGuiNotifications.prototype.i18n.bounce = {
    action : 'R(action)',
    reason : 'R(reason)',
    diagnosticCode : 'R(diag. code)',
    status : 'R(status)'
};



/**
 * Initialize query with current time
 */
nettools.awsSesGuiNotifications.prototype.initialize = function()
{
	this.data.ts = (new Date()).valueOf();
	this.data.lst = [];
    this.count = 0;
}



/**
 * Extract meaningful data for GUI output 
 *
 * @param object m Object litteral of message to process
 * @return string[] Returns an array of columns for a given row of data (1 row = 1 SQS message)
 */
nettools.awsSesGuiNotifications.prototype.getColumns = function(m)
{
	return [ m.timestamp, /*m.type, */m.to, m.subject ].concat(this.getColumnsForType(m));
}



/**
 * Get columns data for specific type of message (delivery or bounce)
 *
 * @param object m Object litteral of message to process
 * @return string[] Returns an array of columns for a given row of data (1 row = 1 SQS message)
 */
nettools.awsSesGuiNotifications.prototype.getColumnsForType = function(m)
{
	if ( this.type == 'Delivery' )
		return [ m.smtpResponse ];
	
	else if ( this.type == 'Bounce' )
		return [ m.action, m.reason, m.status, m.diagnosticCode ];
	
	else
		return [];
}



/**
 * Get column headers
 *
 * @return string[] Returns an array of column headers 
 */
nettools.awsSesGuiNotifications.prototype.getHeaders = function()
{
	return [ this.i18n.timestamp, /*this.i18n.type,*/ this.i18n.recipient, this.i18n.subject ].concat(this.getHeadersForType());
}



/**
 * Get column headers for the type of message processed
 *
 * @return string[] Returns an array of column headers 
 */
nettools.awsSesGuiNotifications.prototype.getHeadersForType = function()
{
	switch ( this.type )
	{
		case 'Delivery' :
			return [ this.i18n.delivery.smtpResponse ];
		
		case 'Bounce' :
			return [ this.i18n.bounce.action, this.i18n.bounce.reason, this.i18n.bounce.status, this.i18n.bounce.diagnosticCode ];
		
		default:
			return [];
	}
}



/**
 * Create CSS styles
 *
 * @return string
 */
nettools.awsSesGuiNotifications.prototype.createCSSContent = function()
{
    return `
#${this.nodeId}{
    margin-top: 1em;
    margin-bottom: 1em;
}

#${this.nodeId} span{
    background-color: ghostwhite;
}

#${this.nodeId} table{
    color:black;
}

#${this.nodeId} table tr:nth-child(2n){
    background-color: whitesmoke;
    color: black;
}
    `
    +
    this.createCSSContentForType();
}



/**
 * Create CSS styles for specific SQS queue type
 *
 * @return string
 */
nettools.awsSesGuiNotifications.prototype.createCSSContentForType = function()
{
    switch ( this.type )
    {
        case 'Delivery':
            return `
#${this.nodeId} table th{
	background-color: darkgreen;
	color:white;
}

#${this.nodeId} table{
	border:2px solid darkgreen;
    background-color: #00640055;
}
                `;
            
            
        case 'Bounce':
            return `
#${this.nodeId} table th{
	background-color: firebrick;
	color:white;
}

#${this.nodeId} table{
	border:2px solid firebrick;
    background-color: #b2222255;
}
                `;
    
    
        default:
            return '';
    }
}



/**
 * Query SQS queue for notification messages
 *
 * @param Promise pr A Promise resolved with data to display
 */
nettools.awsSesGuiNotifications.prototype.updateGUI = function()
{
    function _createRow(cols, kind = 'td') 
    {
        // creating row
        var tr = document.createElement('tr');
        for ( var j = 0 ; j < cols.length ; j++ )
        {
            var td = document.createElement(kind);
            td.innerHTML = cols[j].replace(/\n/g, '<br>');
            tr.appendChild(td);
        }
        
        return tr;
    }
    
    

    var node = document.getElementById(this.nodeId);
    if ( !node )
        return;


    // removing data and creating table content
    node.innerHTML = "<style>" + this.createCSSContent() + "<style>"; 
	
	var span = document.createElement('span');
	var table = document.createElement('table');
    table.className = this.tableClassList;
	


    // creating headers
    table.appendChild(_createRow(this.getHeaders(), 'th'));



    // sort array, most recent first
    var tmp = [];
    for ( var msg in this.data.lst )
        tmp.push(this.data.lst[msg]);


    tmp.sort(function(a,b){
        if ( a.timestamp > b.timestamp )
            return -1;
        else if ( a.timestamp < b.timestamp )
            return 1;
        else
            return 0;					
    });



    // display messages as rows
    for ( var i = 0 ; i < tmp.length ; i++ )
        table.appendChild(_createRow(this.getColumns(tmp[i])));


    span.appendChild(table);
	node.appendChild(span);
}



/**
 * Query SQS queue for notification messages
 *
 * @param Promise pr A Promise resolved with data to display
 * @return Promise Returns a resolved Promise when pr Promise parameter is resolved
 */
nettools.awsSesGuiNotifications.prototype.execute = function(pr)
{
    var that = this;
    
    
	// when promise is resolved, we have data to display
	return pr.then(
			function(r)
			{
				// if new messages 
				for ( var i = 0 ; i < r.messages.length ; i++ )
					if ( that.data.lst[r.messages[i].MessageId] == null )
						that.data.lst[r.messages[i].MessageId] = r.messages[i].Body;

				
				// refresh GUI
				that.updateGUI();
			}
		);
}



/**
 * Query SQS queue for notification messages
 *
 * @param function cb A callback to get a Promise object resolved with SQS data fetch through AWS api
 * @param int times Number of queries to execute
 */
nettools.awsSesGuiNotifications.prototype.update = function(cb, times = 5)
{
    var that = this;
    
    var fun = function(){
        // launch request
        that.execute(cb())
            .then(function()
                {
                    if ( that.data.count < times - 1 )
                    {
                        that.data.count++;
                        window.setTimeout(fun, 1000);
                    }
                }
            ).catch(nettools.jscore.RequestHelper.promiseErrorHandler);
    }
    
    
    // init
    this.initialize();
    
    // first call
    fun();
}
