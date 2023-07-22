<?php


namespace Nettools\AwsSesGuiNotifications\Res\Sms;


use \Nettools\AwsSesGuiNotifications\Res\Model;




final class Sent extends Model
{
	/**
	 * Constructor
	 *
	 * @param string $kind May be set to 'transactional' or 'promotional'
	 */
	public function __construct($kind)
	{
		$this->type = $kind;
	}
}



?>