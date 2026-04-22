$(document).ready(function(){
	$('a').each(function(){
		var $this=$(this);
		var href=this.href;
		var target=this.target;

		if(href && !this.onclick)
		{
			$this.removeAttr('href').wrap($('<span/>').css('cursor','pointer').click(function(){if(target=='_blank'){window.open(href)}else{location.assign(href);}}));
		}
		else if(this.onclick && !$this[0].dataset.except)
		{
			$this.removeAttr('href').css('cursor','pointer');
		}
	});
});