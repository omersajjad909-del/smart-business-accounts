use strict; use warnings;
my ($file, $fromf, $tof) = @ARGV;
local $/;
open my $F, '<:raw', $file or die $!; my $s = <$F>; close $F;
open my $A, '<:raw', $fromf or die $!; my $from = <$A>; close $A;
open my $B, '<:raw', $tof or die $!; my $to = <$B>; close $B;
for ($s, $from, $to) { s/\r\n/\n/g; }
$from =~ s/\n\z//; $to =~ s/\n\z//;
my $count = () = $s =~ /\Q$from\E/g;
die "matches in $file: $count\n" unless $count == 1;
$s =~ s/\Q$from\E/$to/;
$s =~ s/\n/\r\n/g;
open my $O, '>:raw', $file or die $!; print $O $s; close $O;
print "ok $file\n";
