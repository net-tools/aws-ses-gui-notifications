<?php


namespace Nettools\AwsSesGuiNotifications;


use \Aws\Sqs\SqsClient; 
use \Aws\Exception\AwsException;




/**
 * Class to query AWS SQS queues about SES notifications 
 */
class Request {

	protected $credentialProvider = null;
	protected $region = null;
	
	
	/**
	 * Constructor
	 *
	 * @param callable $credentialProvider Object providing credentials to access API ; usually \Aws\Credentials\CredentialProvider::ini('default', '/path/to/file')
	 * @param string $region AWS region
	 * @param string $queue URL of queue to query
	 */
	public function __construct(callable $credentialProvider, string $region)
	{
		$this->credentialProvider = $credentialProvider;
		$this->region = $region;
	}
	
	
	
	/**
	 * Deal with payload ; may be overridden to deal with any custom payload other than SES notifications
	 * 
	 * @param object $body Object litteral 
	 * @return Res\Model|null Return a object describing payload or NULL if an error occured during payload parsing
	 */
	protected function handleBody($body)
	{
		if ( property_exists($body, 'Message') && ($json_message = json_decode($body->Message)) )
			return $this->handleSesPayload($json_message);
		
		
		return null;
	}
	
	
	
	/**
	 * Deal with SES payload
	 * 
	 * @param object $msg Object litteral with SES notification payload message
	 * @return Res\Message\Sent|Res\Message\Bounce Return a object describing payload or NULL if an error occured during payload parsing
	 */
	protected function handleSesPayload($msg)
	{
		$o = null;
		
		
		// deal either with delivery payload or bounce payload
		switch ( $msg->notificationType )
		{
			case 'Delivery':
				$o = new Res\Message\Sent();
				break;

			case 'Bounce': 
				$o = new Res\Message\Bounce();
				break;

			// ignoring other types
			default:
				return NULL;
		}



		if ( property_exists($msg, 'mail') && $msg->mail )
		{
			$o->to = implode(';', $msg->mail->destination);
			$o->timestamp = date('Y-m-d H:i:s', strtotime($msg->mail->timestamp));

			if ( property_exists($msg->mail, 'headers') )
			{
				foreach ( $msg->mail->headers as $h )
					if ( $h->name == 'Subject' )
						$o->subject = $h->value;
			}
			else
				$o->subject = 'n/a';


			// si message ok
			if ( ($o->type == 'Delivery') && property_exists($msg->delivery, 'smtpResponse') )
				$o->smtpResponse = $msg->delivery->smtpResponse;
			else if ( $o->type == 'Bounce' )
			{
				$o->bounce = $msg->bounce;
				$o->reason = property_exists($msg->bounce, 'bounceSubType') ? $msg->bounce->bounceSubType : 'n/a';
				$o->action = property_exists($msg->bounce->bouncedRecipients[0], 'action') ? $msg->bounce->bouncedRecipients[0]->action : 'n/a';
				$o->diagnosticCode = property_exists($msg->bounce->bouncedRecipients[0], 'diagnosticCode') ? $msg->bounce->bouncedRecipients[0]->diagnosticCode : 'n/a';
				$o->status = property_exists($msg->bounce->bouncedRecipients[0], 'status') ? $msg->bounce->bouncedRecipients[0]->status : 'n/a';
			}
			
			
			// return payload object
			return $o;
		}

		// ignoring missing body
		else
			return null;
	}
	
	
	
	/**
	 * Execute a query from a SQS queue
	 *
	 * @param string $queue
	 * @return Res\Model[] Returns an array of objects inheriting Model base resource (may be Res\Message\Sent, Res\Message\Bounce, Res\Sms\Sent, for example)
	 */
	public function execute(string $queue)
	{
		// creating client
		$client = new SqsClient([
			'region' => $this->region,
			'version' => 'latest',
			'credentials' => $this->credentialProvider
		]);

		
		
		$ret = [];


		// receiving SQS queue content
		$result = $client->receiveMessage([
				'AttributeNames' => ['SentTimestamp'],
				'MaxNumberOfMessages' => 10,
				'MessageAttributeNames' => ['All'],
				'QueueUrl' => $queue,
				'WaitTimeSeconds' => 0,
				'VisibilityTimeout' => 10
			]
		);



		if ( !is_null($result->get('Messages')) && count($result->get('Messages')) )
		{
			// deal with all messages
			foreach ( $result->get('Messages') as $m )
			{
				if ( $json_body = json_decode($m['Body']) )
				{
					if ( $o = $this->handleBody($json_body) )
						$ret[] = (object)[
							'MessageId'		=> $m['MessageId'],
							'Body'			=> $o
						];
				}
					/*
					// if SMS payload
					else if ( property_exists($json_body, 'sms') )
					{
						$o = new Res\Sms\Sent($json_body->transactional ? 'transactional':'promotional');
						$o->to = implode(',', $json_body->to);
						$o->timestamp = date('Y-m-d H:i:s', $json_body->timestamp);
						$o->subject = $json_body->sms;						
					}*/
			}
		}


		return $ret;
	}
}


?>