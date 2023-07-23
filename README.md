# net-tools/aws-ses-gui-notifications


## PHP and Javascript interface to query AWS SES notifications

When using AWS SES, it's possible to set bounce and delivery feedback to be published through a SNS topic.
When a SQS queue has subscribed to the SNS topic, it will contain any bounce or delivery messages created during SES *send* action.

This library abstracts most of AWS API-related stuff and deals with GUI output.


## How to use

### Client-side Javascript 

First, include the javascript `api.js.min` file in the web page.

Then, create the API object and execute the request, providing any required parameters :

- `nodeId` is a string set to a DOM tree element `id` value ; this element will contain the output
- `type` is a string setting the kind of SES data we fetch : Delivery or Bounce
- `cssClass` may be set with any CSS class names, making it possible to custom styling the output table


```javascript
// creating API object
var req = new nettools.awsSesGuiNotifications(nodeId, type, cssClass);

// execute request and update GUI
req.update(
	// callback that must return a Promise object resolved with SQS data (see server-side remark below)
	function()
	{
		return fetch('/path/to/a/script.php', {
			method : 'POST'
		})
		.then(function(response){
			return response.json();
		});
	},

	// updates count (see remark below)
	5
);
```

Remarks :
- SQS queues may not return all messages in a single API call ; so it's necessary to perform several request to be sure to have all data.
- Create a server-side PHP file that will perform the AWS API call through our library and return the messages to the Javascript class.



### Server-side PHP 

The server-side PHP file (refered above as `/path/to/a/script.php` must call our API to send the request to AWS SQS :

```php
// creating Request object
$rq = new \Nettools\AwsSesGuiNotifications\Request(\Aws\Credentials\CredentialProvider::ini('default', '/path/to/aws/credentials'), $region);

// perform API call ; set $url_of_sqs_queue with the correct URL of the SQS queue to be queried
$ret = $rq->execute($url_of_sqs_queue);

// answer with json data
header("Content-Type: application/json; charset=utf-8");
echo json_encode($ret);
```

Please note that the `CredentialProvider::ini` call must define a path to a credentials file, and that `$region` must be a string setting the correct AWS region.

The credentials file must contains the following lines, with your key and secrets :
```
[default]
aws_access_key_id = ___key_here___
aws_secret_access_key = ___secret_here___
```
