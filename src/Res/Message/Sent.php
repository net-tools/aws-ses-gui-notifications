<?php


namespace Nettools\AwsSesGuiNotifications\Res\Message;


use \Nettools\AwsSesGuiNotifications\Res\Model;




final class Sent extends Model
{
	public $smtpResponse;
	

	/**
	 * Constructor
	 */
	public function __construct()
	{
		$this->type = 'Delivery';
	}
}



?>