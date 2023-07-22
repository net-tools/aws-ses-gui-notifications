<?php



namespace Nettools\AwsSesGuiNotifications\Res\Message;


use \Nettools\AwsSesGuiNotifications\Res\Model;




final class Bounce extends Model
{
	public $bounce;
	public $reason;
	public $action;
	public $diagnosticCode;
	public $status;

	
	
	/**
	 * Constructor
	 */
	public function __construct()
	{
		$this->type = 'Bounce';
	}
}



?>